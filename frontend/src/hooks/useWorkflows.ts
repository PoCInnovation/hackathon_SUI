"use client";

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignPersonalMessage, useSignTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const API_BASE_URL = 'http://localhost:8000/api';

export interface WorkflowMetadata {
  id: string;
  metadataBlobId: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  price_sui: number;
  created_at: number;
  purchaseCount: number;
  createdAt: number;
}

export interface Strategy {
  id: string;
  version: string;
  meta: {
    name: string;
    author: string;
    description: string;
    created_at: number;
    updated_at: number;
    tags: string[];
    price_sui?: number;
  };
  nodes: any[];
  edges: any[];
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/workflows/list`);
      const result = await response.json();
      
      if (result.success) {
        setWorkflows(result.data);
      } else {
        setError('Failed to fetch workflows');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return { workflows, loading, error, refetch: fetchWorkflows };
}

export function useWorkflowActions() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const suiClient = useSuiClient();

  const uploadWorkflow = async (strategy: Strategy) => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflows/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.data;
    } catch (error: any) {
      throw new Error(`Failed to upload workflow: ${error.message}`);
    }
  };

  const payForWhitelist = async () => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('💰 Starting whitelist payment process...');
      
      // 1. Build payment transaction
      console.log('📝 Building payment transaction...');
      const buildResponse = await fetch(`${API_BASE_URL}/seal/build-whitelist-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: currentAccount.address,
        }),
      });

      const buildResult = await buildResponse.json();
      
      if (!buildResult.success) {
        throw new Error(buildResult.error || 'Failed to build payment transaction');
      }

      console.log('💵 Whitelist Price:', buildResult.data.price_sui, 'SUI');

      // 2. Sign and execute payment
      console.log('🖊️ Please sign the payment transaction...');
      const txBytes = new Uint8Array(buildResult.data.transactionBytes);
      
      // Reconstruct the transaction from bytes
      const transaction = Transaction.from(txBytes);
      
      const signedTx = await signTransaction({
        transaction,
      });

      console.log('📡 Processing payment...');
      const paymentResult = await suiClient.executeTransactionBlock({
        transactionBlock: signedTx.bytes,
        signature: signedTx.signature,
        options: {
          showEffects: true,
        },
      });

      if (!paymentResult.effects || paymentResult.effects.status.status !== 'success') {
        throw new Error('Payment transaction failed');
      }

      console.log('✅ Payment successful! TX:', paymentResult.digest);

      // 3. Confirm payment
      console.log('🔐 Confirming whitelist payment...');
      const confirmResponse = await fetch(`${API_BASE_URL}/seal/confirm-whitelist-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: currentAccount.address,
          transactionDigest: paymentResult.digest,
        }),
      });

      const confirmResult = await confirmResponse.json();
      
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Failed to confirm payment');
      }

      console.log('✅ Successfully added to whitelist!');

      return confirmResult.data;
    } catch (error: any) {
      console.error('❌ Whitelist payment error:', error);
      throw new Error(`Failed to pay for whitelist: ${error.message}`);
    }
  };

  const purchaseWorkflow = async (workflowId: string) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🛒 Purchasing workflow:', workflowId);
      console.log('   Note: You must be in the whitelist (paid 0.5 SUI) to decrypt it');
      
      // Call purchase API - just marks workflow as owned locally
      const response = await fetch(`${API_BASE_URL}/workflows/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          address: currentAccount.address,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Purchase failed');
      }

      console.log('✅ Workflow purchased successfully!');
      console.log('   You can now decrypt it (whitelist will be checked on-chain)');

      return result.data;
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      throw new Error(`Failed to purchase workflow: ${error.message}`);
    }
  };

  const decryptWorkflow = async (workflowId: string): Promise<Strategy> => {
    if (!currentAccount || !signPersonalMessage) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔓 Starting decryption for workflow:', workflowId);
      
      // 1. Get decrypt message (creates and stores session key)
      const messageResponse = await fetch(`${API_BASE_URL}/workflows/get-decrypt-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          address: currentAccount.address,
        }),
      });

      const messageResult = await messageResponse.json();
      if (!messageResult.success) {
        throw new Error(messageResult.error || 'Failed to get decrypt message');
      }

      const { sessionId, message: messageArray } = messageResult.data;
      const message = new Uint8Array(messageArray);
      
      console.log('📝 Got decrypt message, preparing to sign...');

      // Petit délai pour laisser le wallet se préparer
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Sign message avec retry en cas d'erreur de bounds
      let signResult;
      let retries = 3;
      
      while (retries > 0) {
        try {
          console.log('🖊️ Asking wallet to sign... (make sure wallet popup is visible)');
          signResult = await signPersonalMessage({ message });
          console.log('✅ Signature obtained from wallet');
          break;
        } catch (signError: any) {
          retries--;
          if (signError.message?.includes('bounds') || signError.message?.includes('visible')) {
            if (retries > 0) {
              console.log(`⚠️ Wallet popup issue, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw new Error('Wallet popup is not visible. Please make sure your browser window is visible and try again.');
            }
          } else {
            throw signError;
          }
        }
      }

      if (!signResult) {
        throw new Error('Failed to get signature from wallet');
      }

      // 3. Decrypt workflow using stored session key
      console.log('🔐 Calling decrypt API...');
      const decryptResponse = await fetch(`${API_BASE_URL}/workflows/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          address: currentAccount.address,
          signature: signResult.signature,
          sessionId,
        }),
      });

      const decryptResult = await decryptResponse.json();
      
      if (!decryptResult.success) {
        console.error('❌ Decrypt failed:', decryptResult);
        throw new Error(decryptResult.error || 'Decryption failed');
      }

      console.log('✅ Workflow decrypted successfully!');
      // Return the workflow, not the wrapper object
      return decryptResult.data.workflow;
    } catch (error: any) {
      console.error('❌ Decryption error:', error);
      throw new Error(`Failed to decrypt workflow: ${error.message}`);
    }
  };

  const getOwnedWorkflows = async () => {
    if (!currentAccount) {
      return [];
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/workflows/owned/${currentAccount.address}`
      );
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch owned workflows:', error);
      return [];
    }
  };

  return {
    uploadWorkflow,
    payForWhitelist,
    purchaseWorkflow,
    decryptWorkflow,
    getOwnedWorkflows,
  };
}
