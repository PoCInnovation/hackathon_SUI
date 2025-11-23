"use client";

import { motion } from "framer-motion";
import { useWorkflows, useWorkflowActions } from "@/hooks/useWorkflows";
import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export function MarketplaceSection() {
  const { workflows, loading, error } = useWorkflows();
  const { purchaseTemplateAccess, decryptWorkflow } = useWorkflowActions();
  const currentAccount = useCurrentAccount();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [ownedWorkflowIds, setOwnedWorkflowIds] = useState<Set<string>>(new Set());

  // Check which workflows the user already owns
  useEffect(() => {
    if (!currentAccount) return;

    const checkOwnership = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/seal/check-user-templates/${currentAccount.address}`);
        const result = await response.json();

        if (result.success && result.data) {
          const ownedIds = new Set(result.data.map((t: any) => t.templateId));
          setOwnedWorkflowIds(ownedIds);
        }
      } catch (error) {
        console.error('Failed to check owned workflows:', error);
      }
    };

    checkOwnership();
  }, [currentAccount, workflows]);

  const handleDownload = async (workflowId: string, templateName: string) => {
    if (!currentAccount) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setPurchasing(workflowId);
    setMessage(null);

    try {
      setMessage({
        type: 'info',
        text: 'Downloading workflow...'
      });

      // Decrypt and save workflow (user already owns it)
      const decryptedWorkflow = await decryptWorkflow(workflowId);

      // Save to localStorage
      const existingWorkflows = localStorage.getItem('purchased_workflows');
      const workflows = existingWorkflows ? JSON.parse(existingWorkflows) : [];

      // Check if not already in local storage
      if (!workflows.find((w: any) => w.id === decryptedWorkflow.id)) {
        workflows.push(decryptedWorkflow);
        localStorage.setItem('purchased_workflows', JSON.stringify(workflows));
      }

      setMessage({
        type: 'success',
        text: 'Workflow downloaded and saved to your templates!'
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Download failed: ${err.message}` });
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchase = async (workflowId: string, templateIndex: number, templateName: string, priceSui: number) => {
    if (!currentAccount) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setPurchasing(workflowId);
    setMessage(null);

    try {
      // 1. Purchase template access (on-chain payment)
      setMessage({
        type: 'info',
        text: `Purchasing access for ${priceSui} SUI... (check wallet for signature request)`
      });

      await purchaseTemplateAccess(templateIndex, templateName, priceSui);

      setMessage({
        type: 'success',
        text: 'Access purchased! Now downloading workflow...'
      });

      // 2. Decrypt and save workflow (Seal will verify template-specific access on-chain)
      const decryptedWorkflow = await decryptWorkflow(workflowId);

      // Save to localStorage
      const existingWorkflows = localStorage.getItem('purchased_workflows');
      const workflows = existingWorkflows ? JSON.parse(existingWorkflows) : [];
      workflows.push(decryptedWorkflow);
      localStorage.setItem('purchased_workflows', JSON.stringify(workflows));

      // Add to owned set
      setOwnedWorkflowIds(prev => new Set([...prev, workflowId]));

      setMessage({
        type: 'success',
        text: 'Workflow downloaded and saved to your templates!'
      });
    } catch (err: any) {
      // Check for specific errors
      if (err.message?.includes('access') || err.message?.includes('not authorized')) {
        setMessage({
          type: 'error',
          text: 'Access denied. You need to purchase this template first.'
        });
      } else if (err.message?.includes('Duplicate')) {
        setMessage({
          type: 'error',
          text: 'You already own this template!'
        });
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          MARKETPLACE
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Discover and download DeFi strategies
        </p>
      </div>
      <div className="bg-walrus-mint/10 border-4 border-walrus-mint/40 p-8">
        <p className="text-white font-pixel text-sm">LOADING...</p>
      </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          MARKETPLACE
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Discover and download DeFi strategies
        </p>
      </div>
      <div className="bg-red-500/10 border-4 border-red-500/40 p-8">
        <p className="text-white font-pixel text-sm">ERROR: {error}</p>
      </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-pixel text-white tracking-wider">
            MARKETPLACE
          </h1>
        </div>
        <p className="text-gray-500 font-mono text-sm">
          Discover and download DeFi strategies
        </p>
      </div>

      <div className="bg-walrus-mint/10 border-2 border-walrus-mint/40 p-4 mb-6">
          <p className="text-white/80 text-xs font-mono">
            ℹ️ Each template has its own price. When you purchase a template, you get permanent access to decrypt and use it.
          </p>
        </div>

        {message && (
          <div className={`p-4 border-4 ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/40' 
              : message.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/40'
              : 'bg-red-500/10 border-red-500/40'
          }`}>
            <p className="text-white font-pixel text-sm">{message.text}</p>
          </div>
        )}

        <div>
          {workflows.length === 0 ? (
            <div className="bg-walrus-mint/10 border-4 border-walrus-mint/40 p-8">
              <p className="text-white font-pixel text-sm">
                NO WORKFLOWS AVAILABLE YET
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-walrus-mint/10 border-4 border-walrus-mint/40 p-6 cursor-pointer hover:border-walrus-mint/80 transition-all"
                >
                  <h3 className="text-2xl font-pixel text-walrus-mint mb-4">
                    {workflow.name}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <p className="text-white/80 text-sm font-mono">
                      {workflow.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {workflow.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-walrus-mint/20 border border-walrus-mint/40 text-walrus-mint text-xs font-pixel"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-white/60 text-xs font-mono mt-2">
                      By: {workflow.author.slice(0, 8)}...{workflow.author.slice(-6)}
                    </p>

                    <p className="text-walrus-mint text-sm font-pixel">
                      {workflow.purchaseCount || 0} purchases
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-walrus-mint/20">
                    <div className="text-white font-pixel text-xl">
                      {workflow.price_sui} SUI
                    </div>
                    {ownedWorkflowIds.has(workflow.id) ? (
                      <button
                        onClick={() => handleDownload(workflow.id, workflow.name)}
                        disabled={purchasing === workflow.id}
                        className="px-6 py-2 bg-green-500/20 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors font-pixel text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {purchasing === workflow.id ? 'DOWNLOADING...' : '✓ DOWNLOAD'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(workflow.id, index, workflow.name, workflow.price_sui)}
                        disabled={purchasing === workflow.id}
                        className="px-6 py-2 bg-walrus-mint/20 border-2 border-walrus-mint hover:bg-walrus-mint hover:text-black transition-colors font-pixel text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {purchasing === workflow.id ? 'PURCHASING...' : 'BUY'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
