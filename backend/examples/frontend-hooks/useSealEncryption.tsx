/**
 * React Hook for Seal + Walrus File Encryption
 * 
 * Usage:
 * ```tsx
 * import { useSealEncryption } from './hooks/useSealEncryption';
 * 
 * function MyComponent() {
 *   const { encryptFile, decryptFile, loading, error } = useSealEncryption();
 *   
 *   const handleUpload = async (file: File) => {
 *     const metadataBlobId = await encryptFile(file);
 *     // Save metadataBlobId to your database
 *   };
 *   
 *   const handleDownload = async (metadataBlobId: string) => {
 *     await decryptFile(metadataBlobId);
 *   };
 * }
 * ```
 */

import { useState } from 'react';
import { useWallet } from '@mysten/dapp-kit';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface EncryptResult {
  metadataBlobId: string;
  dataBlobId: string;
  nonce: string;
  originalSize: number;
}

export const useSealEncryption = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentAccount, signPersonalMessage } = useWallet();

  /**
   * Encrypt and upload a file to Walrus
   * @returns metadataBlobId - Store this ID to decrypt later
   */
  const encryptFile = async (file: File): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/seal/encrypt`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: { success: boolean; data: EncryptResult } = await response.json();
      
      console.log('✅ File encrypted and stored on Walrus');
      console.log('📦 Metadata Blob ID:', result.data.metadataBlobId);

      return result.data.metadataBlobId;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to encrypt file';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Decrypt and download a file from Walrus
   * Requires user wallet to sign
   */
  const decryptFile = async (metadataBlobId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!currentAccount || !signPersonalMessage) {
        throw new Error('Please connect your wallet first');
      }

      // Step 1: Get the message to sign
      const messageResponse = await fetch(`${API_BASE_URL}/seal/session-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAccount.address }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to get session message');
      }

      const messageData = await messageResponse.json();
      const message = new Uint8Array(messageData.data.message);

      // Step 2: Sign the message with wallet
      console.log('🔐 Please sign the message in your wallet...');
      const signResult = await signPersonalMessage({ message });

      // Step 3: Decrypt the file
      const decryptResponse = await fetch(`${API_BASE_URL}/seal/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadataBlobId,
          address: currentAccount.address,
          signature: signResult.signature,
        }),
      });

      if (!decryptResponse.ok) {
        throw new Error('Failed to decrypt file');
      }

      // Step 4: Download the decrypted file
      const blob = await decryptResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from Content-Disposition header
      const contentDisposition = decryptResponse.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || 'decrypted-file';
      
      a.click();
      window.URL.revokeObjectURL(url);

      console.log('✅ File decrypted and downloaded!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to decrypt file';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get metadata for a file
   */
  const getMetadata = async (metadataBlobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/seal/metadata/${metadataBlobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }
      const result = await response.json();
      return result.data;
    } catch (err: any) {
      console.error('Metadata error:', err);
      throw err;
    }
  };

  return {
    encryptFile,
    decryptFile,
    getMetadata,
    loading,
    error,
  };
};
