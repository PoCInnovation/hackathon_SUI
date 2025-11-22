/**
 * Example React Component using Seal Encryption
 */

import React, { useState } from 'react';
import { useSealEncryption } from '../hooks/useSealEncryption';

export const FileUploadExample: React.FC = () => {
  const { encryptFile, decryptFile, loading, error } = useSealEncryption();
  const [metadataBlobId, setMetadataBlobId] = useState<string>('');
  const [savedBlobIds, setSavedBlobIds] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const blobId = await encryptFile(file);
      setMetadataBlobId(blobId);
      setSavedBlobIds(prev => [...prev, blobId]);
      alert(`File encrypted! Blob ID: ${blobId}`);
    } catch (err) {
      console.error('Encryption failed:', err);
    }
  };

  const handleDecrypt = async (blobId: string) => {
    try {
      await decryptFile(blobId);
    } catch (err) {
      console.error('Decryption failed:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔐 Seal File Encryption</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Upload & Encrypt</h2>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={loading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {loading && <p className="mt-2 text-gray-600">Encrypting...</p>}
        {metadataBlobId && (
          <div className="mt-3 p-3 bg-green-50 rounded">
            <p className="text-sm font-mono break-all">
              <strong>Metadata Blob ID:</strong> {metadataBlobId}
            </p>
          </div>
        )}
      </div>

      {/* Decrypt Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Decrypt & Download</h2>
        <input
          type="text"
          placeholder="Enter Metadata Blob ID"
          value={metadataBlobId}
          onChange={(e) => setMetadataBlobId(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
        />
        <button
          onClick={() => handleDecrypt(metadataBlobId)}
          disabled={!metadataBlobId || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? 'Decrypting...' : 'Decrypt File'}
        </button>
      </div>

      {/* Saved Files List */}
      {savedBlobIds.length > 0 && (
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Your Encrypted Files</h2>
          <ul className="space-y-2">
            {savedBlobIds.map((blobId, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-mono truncate flex-1">{blobId}</span>
                <button
                  onClick={() => handleDecrypt(blobId)}
                  className="ml-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Decrypt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
