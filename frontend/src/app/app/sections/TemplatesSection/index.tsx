"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Play, Edit, Trash2, Upload, Copy, Layers, Calendar, User, X, GripVertical } from "lucide-react";
import type { Strategy } from "@/hooks/useWorkflows";
import { api } from "@/services/api";

export function TemplatesSection() {
  const currentAccount = useCurrentAccount();
  const [templates, setTemplates] = useState<Strategy[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Strategy | null>(null);

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

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

    // Check network
    // Note: We assume Mainnet is 'sui:mainnet'
    // You might need to import useCurrentWallet or similar to get the chain
    // For now, we'll rely on the user checking their wallet, but we can add a console log
    console.log("Current account:", currentAccount);

    try {
      // 1. Build transaction
      const buildRes = await api.buildTransaction(selectedTemplate, currentAccount.address);
      
      if (!buildRes.success || !buildRes.transactionBytes) {
        throw new Error(buildRes.error || "Failed to build transaction");
      }

      // 2. Decode base64 to Uint8Array
      const binaryString = atob(buildRes.transactionBytes);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Sign and Execute
      const tx = Transaction.from(bytes);

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction executed:", result);
            alert(`Strategy executed successfully! Digest: ${result.digest}`);
          },
          onError: (error) => {
            console.error("Execution failed:", error);
            alert(`Execution failed: ${error.message}`);
          },
        }
      );
    } catch (error: any) {
      console.error("Run strategy error:", error);
      alert(`Failed to run strategy: ${error.message}`);
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
              onClick={() => setSelectedTemplate(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0a0f1e] border-l-2 border-gray-800 z-50 shadow-2xl flex flex-col"
            >
              {/* Panel Header */}
              <div className="p-8 border-b border-gray-800 flex justify-between items-start bg-[#0a0f1e]">
                <div>
                  <h2 className="text-3xl font-pixel text-white mb-2">
                    {selectedTemplate.meta.name}
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{selectedTemplate.meta.author || "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{new Date(selectedTemplate.meta.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-8">
                  {/* Description */}
                  <div className="bg-[#0f1629] border border-gray-800 p-6 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <h3 className="font-mono text-xs text-blue-400 uppercase mb-2">Description</h3>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      {selectedTemplate.meta.description || "No description provided."}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#0a0a0a] border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-mono text-white font-bold mb-1">{selectedTemplate.nodes.length}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-mono">Nodes</div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-mono text-white font-bold mb-1">{selectedTemplate.edges.length}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-mono">Edges</div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-mono text-white font-bold mb-1">{selectedTemplate.version}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-mono">Version</div>
                    </div>
                  </div>

                  {/* Sequence Preview */}
                  <div>
                    <h3 className="font-mono text-sm text-white uppercase mb-4 flex items-center gap-2">
                      <Layers size={16} className="text-blue-500" />
                      Execution Sequence
                    </h3>
                    <div className="space-y-3">
                      {selectedTemplate.nodes.map((node: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 transition-colors group">
                          <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-500 font-mono text-xs border border-gray-800 group-hover:border-blue-500/50 group-hover:text-blue-400 transition-colors">
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-sm font-mono text-blue-300 font-bold">{node.type}</div>
                            <div className="text-xs font-mono text-gray-600">{node.protocol}</div>
                          </div>
                          {/* Params Preview (Simplified) */}
                          <div className="ml-auto text-right">
                            {node.params.asset && (
                              <div className="text-xs font-mono text-gray-500">
                                {node.params.asset.split('::').pop()}
                              </div>
                            )}
                            {node.params.amount && (
                              <div className="text-xs font-mono text-gray-500">
                                {(parseInt(node.params.amount) / 1_000_000_000).toFixed(2)} SUI
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Footer Actions */}
              <div className="p-8 border-t border-gray-800 bg-[#0a0f1e] grid grid-cols-2 gap-4">
                <button 
                  className="col-span-2 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white p-4 font-mono text-sm font-bold transition-colors uppercase tracking-wider"
                  onClick={handleRunStrategy}
                >
                  <Play size={18} />
                  Run Strategy
                </button>
                
                <button 
                  className="flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 text-gray-300 p-3 font-mono text-xs font-bold transition-colors uppercase"
                  onClick={() => alert("Edit functionality coming soon!")}
                >
                  <Edit size={16} />
                  Edit
                </button>
                
                <button 
                  className="flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 text-gray-300 p-3 font-mono text-xs font-bold transition-colors uppercase"
                  onClick={() => alert("Publish functionality coming soon!")}
                >
                  <Upload size={16} />
                  Publish
                </button>

                <button 
                  className="col-span-2 flex items-center justify-center gap-2 text-red-500 hover:text-red-400 p-2 font-mono text-xs transition-colors uppercase mt-2"
                  onClick={() => handleDelete(selectedTemplate.id)}
                >
                  <Trash2 size={14} />
                  Delete Strategy
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
