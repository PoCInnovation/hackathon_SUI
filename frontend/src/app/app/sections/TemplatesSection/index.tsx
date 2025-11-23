"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { ExecutionSteps } from "./components/ExecutionSteps";
import { Transaction } from "@mysten/sui/transactions";
import { Play, Edit, Trash2, Upload, Copy, Layers, Calendar, User, X, GripVertical, Loader2 } from "lucide-react";
import type { Strategy } from "@/hooks/useWorkflows";
import { api } from "@/services/api";
import { useWorkflowActions } from "@/hooks/useWorkflows";
import { PublishModal } from "../BuilderSection/components/PublishModal";
import { Snackbar, Alert } from "@mui/material";
import { ExecutionStepDetail, ExecutionHistoryEntry, Log, ExecutionStatus } from "./components/types";

export function TemplatesSection() {
  const currentAccount = useCurrentAccount();
  const [templates, setTemplates] = useState<Strategy[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Strategy | null>(null);
  
  // Execution State
  const [executionLogs, setExecutionLogs] = useState<Log[]>([]);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [txDigest, setTxDigest] = useState<string | undefined>();
  const [executionSteps, setExecutionSteps] = useState<ExecutionStepDetail[]>([]);
  const executionStepsRef = useRef<ExecutionStepDetail[]>([]);

  // Publish State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const { uploadWorkflow } = useWorkflowActions();

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const addLog = (message: string, type: Log['type'] = 'info') => {
    setExecutionLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  };

  // Extract execution steps from strategy nodes
  const extractStepsFromStrategy = (strategy: Strategy): ExecutionStepDetail[] => {
    return strategy.nodes
      .filter(node => ['FLASH_BORROW', 'DEX_SWAP', 'FLASH_REPAY', 'COIN_MERGE', 'COIN_SPLIT'].includes(node.type))
      .map((node, index) => {
        const step: ExecutionStepDetail = {
          id: node.id,
          order: index + 1,
          type: node.type as 'FLASH_BORROW' | 'DEX_SWAP' | 'FLASH_REPAY' | 'COIN_MERGE' | 'COIN_SPLIT',
          protocol: node.protocol || 'UNKNOWN',
          status: 'pending',
          inputs: {
            coinType: node.params?.coin_type,
            amount: node.params?.amount,
            amountDisplay: node.params?.amount ? `${(parseInt(node.params.amount) / 1_000_000_000).toFixed(4)} SUI` : undefined,
            pool: node.params?.pool_id,
            direction: node.params?.direction,
          },
          metadata: node.params,
          logs: [],
        };
        return step;
      });
  };

  useEffect(() => {
    const loadTemplates = () => {
      const allStrategies: Strategy[] = [];

      // 1. Load saved strategies
      const savedStored = localStorage.getItem('saved_strategies');
      if (savedStored) {
        try {
          const parsed = JSON.parse(savedStored);
          if (Array.isArray(parsed)) allStrategies.push(...parsed);
        } catch (err) {
          console.error('Failed to parse saved_strategies:', err);
        }
      }

      // 2. Load purchased workflows
      const purchasedStored = localStorage.getItem('purchased_workflows');
      if (purchasedStored) {
        try {
          const parsed = JSON.parse(purchasedStored);
          const normalized = parsed.map((item: any) => {
            if (item.workflow && !item.meta) return item.workflow;
            return item;
          });
          if (Array.isArray(normalized)) allStrategies.push(...normalized);
        } catch (err) {
          console.error('Failed to parse purchased_workflows:', err);
        }
      }

      // Unique & Sort
      const uniqueStrategies = Array.from(new Map(allStrategies.map(item => [item.id, item])).values());
      uniqueStrategies.sort((a, b) => (b.meta.created_at || 0) - (a.meta.created_at || 0));

      setTemplates(uniqueStrategies);
    };

    loadTemplates();
    const handleStorageChange = () => loadTemplates();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleDelete = (workflowId: string) => {
    if (!window.confirm('Are you sure you want to delete this strategy?')) return;

    const filtered = templates.filter(t => t.id !== workflowId);
    setTemplates(filtered);

    // Update storages
    ['saved_strategies', 'purchased_workflows'].forEach(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const newStored = parsed.filter((t: any) => (t.workflow?.id || t.id) !== workflowId);
          localStorage.setItem(key, JSON.stringify(newStored));
        } catch (e) { console.error(e); }
      }
    });
    
    if (selectedTemplate?.id === workflowId) setSelectedTemplate(null);
  };

  const handleCopy = (template: Strategy) => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    alert('Strategy JSON copied to clipboard!');
  };

  const handleRunStrategy = async () => {
    if (!selectedTemplate || !currentAccount) {
      alert("Please connect your wallet first");
      return;
    }

    // Reset state
    setExecutionStatus('building');
    setExecutionLogs([]);
    setTxDigest(undefined);
    const steps = extractStepsFromStrategy(selectedTemplate);
    setExecutionSteps(steps);
    executionStepsRef.current = steps; // Store in ref for access in callbacks

    addLog(`Initializing strategy execution: ${selectedTemplate.meta.name}`, 'info');
    addLog(`Network: Mainnet`, 'info');
    addLog(`Sender: ${currentAccount.address}`, 'info');
    addLog(`Total steps: ${steps.length}`, 'info');

    try {
      // 1. Build transaction
      addLog("Building transaction on backend...", 'info');
      const buildRes = await api.buildTransaction(selectedTemplate, currentAccount.address);
      
      if (!buildRes.success || !buildRes.transactionBytes) {
        throw new Error(buildRes.error || "Failed to build transaction");
      }
      addLog("Transaction built successfully.", 'success');

      // 2. Decode base64 to Uint8Array
      const binaryString = atob(buildRes.transactionBytes);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      addLog(`Transaction size: ${bytes.length} bytes`, 'info');

      // 3. Sign and Execute
      setExecutionStatus('signing');
      addLog("Requesting wallet signature...", 'info');
      
      const tx = Transaction.from(bytes);

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction executed:", result);
            console.log(`SuiScan URL: https://suiscan.xyz/mainnet/tx/${result.digest}`);

            // Set executing status briefly before success
            setExecutionStatus('executing');
            addLog("Executing transaction on Sui Mainnet...", 'info');

            // Small delay to show executing state
            setTimeout(() => {
              setExecutionStatus('success');
              setTxDigest(result.digest);

              // Use ref to get the latest executionSteps (avoid closure issues)
              let currentSteps = executionStepsRef.current;
              
              // Fallback: if ref is empty, try to re-extract from template
              if (!currentSteps || currentSteps.length === 0) {
                currentSteps = extractStepsFromStrategy(selectedTemplate);
              }

              // Add logs immediately to state
              const finalLogs: Log[] = [
                ...executionLogs,
                { timestamp: Date.now(), message: "Transaction submitted to the network!", type: 'success' as const },
                { timestamp: Date.now(), message: `Digest: ${result.digest}`, type: 'success' as const },
                { timestamp: Date.now(), message: "Execution completed successfully.", type: 'success' as const },
              ];

              const historyEntry: ExecutionHistoryEntry = {
                id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                date: new Date().toISOString(),
                strategyId: selectedTemplate.id,
                strategyName: selectedTemplate.meta.name,
                strategyDescription: selectedTemplate.meta.description,
                status: 'success' as const,
                txDigest: result.digest,
                network: 'mainnet',
                sender: currentAccount.address,
                logs: finalLogs,
                effects: result.effects,
                executionSteps: currentSteps.map(step => ({
                  ...step,
                  status: 'success' as const,
                })),
                stats: {
                  totalSteps: currentSteps.length,
                  successfulSteps: currentSteps.length,
                  failedSteps: 0,
                  totalDuration: finalLogs[finalLogs.length - 1]?.timestamp - (finalLogs[0]?.timestamp || Date.now()),
                },
              };

              const existingHistory = localStorage.getItem('execution_history');
              let history: ExecutionHistoryEntry[] = [];

              try {
                history = existingHistory ? JSON.parse(existingHistory) : [];
              } catch (e) {
                history = [];
              }

              history.unshift(historyEntry); // Add to beginning

              // Keep only last 100 executions
              if (history.length > 100) {
                history.splice(100);
              }

              try {
                localStorage.setItem('execution_history', JSON.stringify(history));
                
                // Notify user
                setNotification({ type: 'success', message: 'Execution recorded in history' });
              } catch (error) {
                console.error('❌ Failed to save to localStorage:', error);
                setNotification({ type: 'error', message: 'Failed to save execution history' });
              }

              // Update logs state
              setExecutionLogs(finalLogs);

              // Update executionSteps state to mark them as success
              setExecutionSteps(currentSteps.map(step => ({
                ...step,
                status: 'success' as const,
              })));

              // Dispatch custom event to notify other components
              window.dispatchEvent(new CustomEvent('execution_history_updated', { detail: historyEntry }));
            }, 500);
          },
          onError: (error) => {
            console.error("Execution failed:", error);
            setExecutionStatus('error');
            addLog(`Execution failed: ${error.message}`, 'error');

            // Save failed execution to history
            let currentSteps = executionStepsRef.current;
            
            // Fallback: if ref is empty, try to re-extract from template
            if (!currentSteps || currentSteps.length === 0) {
              currentSteps = extractStepsFromStrategy(selectedTemplate);
            }

            const finalLogs: Log[] = [
              ...executionLogs,
              { timestamp: Date.now(), message: `Execution failed: ${error.message}`, type: 'error' as const },
            ];

            const historyEntry: ExecutionHistoryEntry = {
              id: `exec_fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              date: new Date().toISOString(),
              strategyId: selectedTemplate.id,
              strategyName: selectedTemplate.meta.name,
              strategyDescription: selectedTemplate.meta.description,
              status: 'error' as const,
              network: 'mainnet',
              sender: currentAccount.address,
              logs: finalLogs,
              executionSteps: currentSteps.map(step => ({
                ...step,
                status: 'error' as const, // Mark all steps as error/cancelled for now
                error: { message: error.message }
              })),
              stats: {
                totalSteps: currentSteps.length,
                successfulSteps: 0,
                failedSteps: currentSteps.length,
                totalDuration: Date.now() - (executionLogs[0]?.timestamp || Date.now()),
              },
            };

            try {
              const existingHistory = localStorage.getItem('execution_history');
              const history = existingHistory ? JSON.parse(existingHistory) : [];
              history.unshift(historyEntry);
              
              if (history.length > 100) history.splice(100);
              
              localStorage.setItem('execution_history', JSON.stringify(history));
              setNotification({ type: 'error', message: 'Failed execution recorded in history' });
              
              // Dispatch event
              window.dispatchEvent(new CustomEvent('execution_history_updated', { detail: historyEntry }));
            } catch (e) {
              console.error('❌ Failed to save error history:', e);
            }
          },
        }
      );
    } catch (error: any) {
      console.error("Run strategy error:", error);
      setExecutionStatus('error');
      addLog(`Error: ${error.message}`, 'error');
    }
  };

  const handlePublishClick = () => {
    if (!currentAccount) {
      setNotification({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }
    setPublishModalOpen(true);
  };

  const handlePublish = async (data: { name: string; description: string; price: number; tags: string[] }) => {
    if (!currentAccount || !selectedTemplate) return;

    setPublishing(true);
    try {
      // Update the selected template's metadata with user input
      const updatedStrategy: Strategy = {
        ...selectedTemplate,
        meta: {
          ...selectedTemplate.meta,
          name: data.name,
          description: data.description,
          tags: data.tags,
          price_sui: data.price,
          updated_at: Date.now()
        }
      };

      // Call the uploadWorkflow function
      await uploadWorkflow(updatedStrategy);
      
      setNotification({ type: 'success', message: 'Workflow published successfully!' });
      setPublishModalOpen(false);
      setSelectedTemplate(null);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to publish workflow' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-8">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          STRATEGY FOLDER
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Manage and execute your DeFi strategies
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-800 bg-[#0a0a0a]/50">
          <div className="text-center">
            <Layers size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-mono text-sm mb-2">NO STRATEGIES FOUND</p>
            <p className="text-gray-600 text-xs font-mono">Create one in the Builder or buy from Marketplace</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar">
          {templates.map((template, index) => {
            // Generate a deterministic color based on ID for visual variety
            const colors = [
              { border: "#a855f7", glow: "#a855f740", text: "#c084fc" }, // Purple
              { border: "#3b82f6", glow: "#3b82f640", text: "#60a5fa" }, // Blue
              { border: "#10b981", glow: "#10b98140", text: "#34d399" }, // Emerald
              { border: "#f59e0b", glow: "#f59e0b40", text: "#fbbf24" }, // Amber
            ];
            const color = colors[index % colors.length];

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedTemplate(template)}
                className="relative group cursor-pointer"
              >
                <div 
                  className="bg-[#0a0a0a] border-2 p-5 relative overflow-hidden transition-all duration-200 hover:border-opacity-100 h-full flex flex-col"
                  style={{
                    borderColor: `${color.border}50`,
                  }}
                >
                  {/* Top Corner Accents */}
                  <div className="absolute top-0 left-0 w-3 h-3" style={{ backgroundColor: color.border }} />
                  <div className="absolute top-0 right-0 w-3 h-3" style={{ backgroundColor: color.border }} />

                  {/* Hover Glow */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 40px ${color.glow}`,
                    }}
                  />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 relative z-10">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 border-2"
                        style={{
                          borderColor: color.border,
                          backgroundColor: '#000',
                        }}
                      >
                        <Layers size={20} style={{ color: color.text }} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-mono text-sm font-bold uppercase tracking-wider"
                            style={{ color: color.text }}
                          >
                            STRATEGY
                          </span>
                          <span 
                            className="px-2 py-0.5 border font-mono text-[10px] font-bold"
                            style={{
                              borderColor: color.border,
                              backgroundColor: '#000',
                              color: color.text,
                            }}
                          >
                            #{index + 1}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-gray-600 mt-0.5">
                          ID: {template.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 relative z-10">
                    <h3 className="font-mono text-lg font-bold text-white mb-2 line-clamp-1">
                      {template.meta.name || "Untitled Strategy"}
                    </h3>
                    <p className="text-gray-500 text-xs font-mono line-clamp-3 mb-4">
                      {template.meta.description || "No description provided."}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {template.meta.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 font-mono uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Corners on Hover */}
                  <motion.div 
                    className="absolute bottom-0 left-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ backgroundColor: color.border }} 
                  />
                  <motion.div 
                    className="absolute bottom-0 right-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ backgroundColor: color.border }} 
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Slide-in Details Panel */}
      <AnimatePresence>
        {selectedTemplate && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (executionStatus === 'building' || executionStatus === 'signing' || executionStatus === 'executing') {
                  if (!window.confirm("Execution in progress. Are you sure you want to close?")) return;
                }
                setSelectedTemplate(null);
                setExecutionStatus('idle');
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#050a14] border-l border-blue-500/30 z-50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
            >
              {/* Decorative Background Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.5)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />

              {/* Panel Header */}
              <div className="p-8 border-b border-white/10 flex justify-between items-start gap-4 bg-[#050a14]/90 backdrop-blur relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                      Strategy Protocol
                    </div>
                    {selectedTemplate.version && (
                      <div className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                        v{selectedTemplate.version}
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-pixel text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-wide truncate">
                    {selectedTemplate.meta.name}
                  </h2>
                  <div className="flex items-center gap-6 text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-blue-500" />
                      <span className="text-gray-400">{selectedTemplate.meta.author || "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-gray-400">{new Date(selectedTemplate.meta.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="group p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/50 transition-all duration-300"
                    title="Delete Strategy"
                  >
                    <Trash2 size={20} className="text-gray-500 group-hover:text-red-400" />
                  </button>
                  <button 
                    onClick={() => setSelectedTemplate(null)}
                    className="group p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/50 transition-all duration-300"
                  >
                    <X size={24} className="text-gray-500 group-hover:text-red-400" />
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex flex-col gap-8 relative z-10">
                


                {/* Description Box */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded opacity-50 group-hover:opacity-100 transition duration-500 blur"></div>
                  <div className="relative bg-[#0a0f1e] border border-white/10 p-6">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <h3 className="font-mono text-[10px] text-blue-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      System Description
                    </h3>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      {selectedTemplate.meta.description || "No description provided for this strategy."}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Nodes", value: selectedTemplate.nodes.length, icon: Layers },
                    { label: "Edges", value: selectedTemplate.edges.length, icon: GripVertical },
                    { label: "Complexity", value: "LOW", icon: Layers } // Placeholder logic
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#0a0f1e] border border-white/5 p-4 relative group hover:border-blue-500/30 transition-colors">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/20 group-hover:border-blue-500 transition-colors" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20 group-hover:border-blue-500 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-2">
                        <stat.icon size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">{stat.label}</div>
                      </div>
                      <div className="text-2xl font-mono text-white font-bold">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Execution Sequence */}
                <div>
                  <h3 className="font-mono text-sm text-white uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Layers size={16} className="text-blue-500" />
                    Execution Sequence
                  </h3>
                  <div className="relative space-y-4 pl-4">
                    {/* Circuit Line */}
                    <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-transparent" />

                    {selectedTemplate.nodes.map((node: any, i: number) => (
                      <div key={i} className="relative flex items-center gap-4 group">
                        {/* Node Number */}
                        <div className="relative z-10 w-12 h-12 flex shrink-0 items-center justify-center bg-[#0a0f1e] border border-white/10 group-hover:border-blue-500 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300">
                          <span className="font-pixel text-xs text-gray-500 group-hover:text-blue-400">{i + 1}</span>
                        </div>

                        {/* Node Card */}
                        <div className="flex-1 bg-[#0a0f1e] border border-white/5 p-4 group-hover:bg-white/[0.02] group-hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
                          {/* Scanline effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs font-mono text-blue-400 mb-1">{node.protocol}</div>
                              <div className="text-sm font-bold font-mono text-white tracking-wide">{node.type}</div>
                            </div>
                            {/* Params Preview */}
                            <div className="text-right">
                              {node.params.amount && (
                                <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                  {(parseInt(node.params.amount) / 1_000_000_000).toFixed(2)} SUI
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer Actions */}
              <div className="p-8 border-t border-white/10 bg-[#050a14] relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    className="col-span-2 relative overflow-hidden group bg-blue-600 hover:bg-blue-500 text-white p-4 font-mono text-sm font-bold transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleRunStrategy}
                    disabled={executionStatus === 'building' || executionStatus === 'signing' || executionStatus === 'executing'}
                  >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <div className="relative flex items-center justify-center gap-3">
                      {executionStatus === 'idle' || executionStatus === 'success' || executionStatus === 'error' ? (
                        <>
                          <Play size={18} className="fill-current" />
                          Run Strategy
                        </>
                      ) : (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Running...
                        </>
                      )}
                    </div>
                  </button>
                  
                  <button 
                    className="flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-gray-300 p-3 font-mono text-xs font-bold transition-all uppercase group"
                    onClick={() => alert("Edit functionality coming soon!")}
                  >
                    <Edit size={16} className="group-hover:text-blue-400 transition-colors" />
                    Edit
                  </button>
                  
                  <button 
                    className="flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-gray-300 p-3 font-mono text-xs font-bold transition-all uppercase group"
                    onClick={handlePublishClick}
                  >
                    <Upload size={16} className="group-hover:text-purple-400 transition-colors" />
                    Publish
                  </button>
                </div>
                

                {/* Execution Steps in Footer */}
                <AnimatePresence>
                  {executionStatus !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <ExecutionSteps 
                        logs={executionLogs} 
                        status={executionStatus} 
                        txDigest={txDigest}
                        onClose={() => setExecutionStatus('idle')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PublishModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublish={handlePublish}
        loading={publishing}
      />

      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.type} 
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
