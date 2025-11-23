"use client";

import { motion } from "framer-motion";
import { useWorkflows, useWorkflowActions } from "@/hooks/useWorkflows";
import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export function MarketplaceSection() {
  const { workflows, loading, error } = useWorkflows();
  const { purchaseWorkflow, decryptWorkflow, payForWhitelist } = useWorkflowActions();
  const currentAccount = useCurrentAccount();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [payingWhitelist, setPayingWhitelist] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const handleWhitelistPayment = async () => {
    if (!currentAccount) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setPayingWhitelist(true);
    setMessage(null);

    try {
      await payForWhitelist();
      
      setMessage({ 
        type: 'success', 
        text: 'Successfully added to whitelist! You can now purchase workflows.' 
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setPayingWhitelist(false);
    }
  };

  const handlePurchase = async (workflowId: string) => {
    if (!currentAccount) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setPurchasing(workflowId);
    setMessage(null);

    try {
      // Acheter le workflow (juste marque comme possédé)
      await purchaseWorkflow(workflowId);
      
      setMessage({
        type: 'success',
        text: 'Downloading workflow... (check wallet for signature request)'
      });

      // Décrypter et sauvegarder dans localStorage (seal_approve vérifie whitelist)
      const decryptedWorkflow = await decryptWorkflow(workflowId);
      
      // Récupérer les workflows existants
      const existingWorkflows = localStorage.getItem('purchased_workflows');
      const workflows = existingWorkflows ? JSON.parse(existingWorkflows) : [];
      
      // Ajouter le nouveau workflow
      workflows.push(decryptedWorkflow);
      localStorage.setItem('purchased_workflows', JSON.stringify(workflows));

      setMessage({
        type: 'success',
        text: 'Workflow downloaded and saved to your templates!'
      });
    } catch (err: any) {
      // Check if error is about whitelist
      if (err.message?.includes('whitelist') || err.message?.includes('not authorized')) {
        setMessage({ 
          type: 'error', 
          text: 'You must be in the whitelist to decrypt workflows. Please pay 0.5 SUI first.' 
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
          
          <button
            onClick={handleWhitelistPayment}
            disabled={payingWhitelist || !currentAccount}
            className="px-6 py-3 bg-walrus-mint/20 border-4 border-walrus-mint hover:bg-walrus-mint hover:text-black transition-colors font-pixel text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {payingWhitelist ? 'PROCESSING...' : 'PAY 0.5 SUI FOR WHITELIST'}
          </button>
        </div>
        <p className="text-gray-500 font-mono text-sm">
          Discover and download DeFi strategies
        </p>
      </div>

      <div className="bg-walrus-mint/10 border-2 border-walrus-mint/40 p-4 mb-6">
          <p className="text-white/80 text-xs font-mono">
            ℹ️ To purchase and decrypt workflows, you must first pay 0.5 SUI to join the whitelist.
            This is a one-time payment that gives you access to decrypt all workflows you purchase.
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
              {workflows.map((workflow) => (
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
                      {workflow.tags.map((tag) => (
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
                      {workflow.purchaseCount} purchases
                    </p>
                  </div>

                  <div className="flex justify-end items-center pt-4 border-t border-walrus-mint/20">
                    <button
                      onClick={() => handlePurchase(workflow.id)}
                      disabled={purchasing === workflow.id}
                      className="px-6 py-2 bg-walrus-mint/20 border-2 border-walrus-mint hover:bg-walrus-mint hover:text-black transition-colors font-pixel text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchasing === workflow.id ? 'DOWNLOADING...' : 'DOWNLOAD FREE'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
