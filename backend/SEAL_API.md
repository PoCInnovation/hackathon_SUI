# Seal + Walrus API Documentation

## 🔐 Encryption & Decentralized Storage API

### Base URL
```
http://localhost:3000/api
```

---

## Endpoints

### 1. **Encrypt & Store File**

**POST** `/seal/encrypt`

Encrypt a file using Seal IBE and store on Walrus decentralized storage.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File to encrypt (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "metadataBlobId": "stliAtxMGFk9we0dHwu8HtU9yZy2zPzhAd6FC7tVrrY",
    "dataBlobId": "P3NLt_Es98PVY8CNWF8KN7JsZLcuI4dDy3QMPaVp6pE",
    "nonce": "file-1763822121154",
    "originalSize": 57
  },
  "walrusUrls": {
    "metadata": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/stliAtxMGFk9we0dHwu8HtU9yZy2zPzhAd6FC7tVrrY",
    "data": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/P3NLt_Es98PVY8CNWF8KN7JsZLcuI4dDy3QMPaVp6pE"
  }
}
```

**Frontend Example:**
```typescript
const encryptFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/seal/encrypt', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  // Store metadataBlobId for later decryption
  return result.data.metadataBlobId;
};
```

---

### 2. **Get Session Message to Sign**

**POST** `/seal/session-message`

Get the personal message that needs to be signed by the user's wallet for decryption.

**Request:**
```json
{
  "address": "0x904f64f755764162a228a7da49b1288160597165ec60ebbf5fb9a94957db76c3"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": [145, 149, 66, ...],
    "messageHex": "91954200..."
  }
}
```

**Frontend Example:**
```typescript
const getSessionMessage = async (walletAddress: string) => {
  const response = await fetch('http://localhost:3000/api/seal/session-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: walletAddress }),
  });

  const result = await response.json();
  return new Uint8Array(result.data.message);
};
```

---

### 3. **Decrypt & Retrieve File**

**POST** `/seal/decrypt`

Decrypt a file from Walrus storage using the metadata blob ID and wallet signature.

**Request:**
```json
{
  "metadataBlobId": "stliAtxMGFk9we0dHwu8HtU9yZy2zPzhAd6FC7tVrrY",
  "address": "0x904f64f755764162a228a7da49b1288160597165ec60ebbf5fb9a94957db76c3",
  "signature": "AQMxY2..."
}
```

**Response:**
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="original-filename.txt"`
- Body: Decrypted file as binary

**Frontend Example:**
```typescript
const decryptFile = async (
  metadataBlobId: string, 
  walletAddress: string,
  signPersonalMessage: (message: Uint8Array) => Promise<string>
) => {
  // 1. Get message to sign
  const message = await getSessionMessage(walletAddress);
  
  // 2. Sign with wallet
  const signature = await signPersonalMessage(message);
  
  // 3. Decrypt
  const response = await fetch('http://localhost:3000/api/seal/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadataBlobId,
      address: walletAddress,
      signature,
    }),
  });

  // 4. Download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'decrypted-file';
  a.click();
};
```

---

### 4. **Get Metadata**

**GET** `/seal/metadata/:blobId`

Retrieve metadata for a specific blob.

**Request:**
- Method: `GET`
- Params: `blobId` - The metadata blob ID

**Response:**
```json
{
  "success": true,
  "data": {
    "packageId": "0x62d5d773ee18880e3ec80a8f6beaee30e1cd961cbbf4c712959ce63f9893fd88",
    "whitelistId": "0x63090ed01c52e4963a31a6b27e91f5608bd297b1b3a5b3e63e4d8191540251be",
    "nonce": "file-1763822121154",
    "dataBlobId": "P3NLt_Es98PVY8CNWF8KN7JsZLcuI4dDy3QMPaVp6pE",
    "timestamp": 1763822121154,
    "originalSize": 57,
    "originalFilename": "secret.txt"
  }
}
```

**Frontend Example:**
```typescript
const getMetadata = async (metadataBlobId: string) => {
  const response = await fetch(
    `http://localhost:3000/api/seal/metadata/${metadataBlobId}`
  );
  return await response.json();
};
```

---

## Complete Frontend Integration Example

```typescript
import { useWallet } from '@mysten/dapp-kit';

const FileEncryption = () => {
  const { currentAccount, signPersonalMessage } = useWallet();

  const handleEncrypt = async (file: File) => {
    // Upload and encrypt
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/seal/encrypt', {
      method: 'POST',
      body: formData,
    });

    const { data } = await response.json();
    console.log('✅ File encrypted!');
    console.log('📦 Metadata Blob ID:', data.metadataBlobId);
    
    // Save metadataBlobId to database/state
    return data.metadataBlobId;
  };

  const handleDecrypt = async (metadataBlobId: string) => {
    if (!currentAccount || !signPersonalMessage) {
      throw new Error('Wallet not connected');
    }

    // 1. Get session message
    const messageResponse = await fetch('http://localhost:3000/api/seal/session-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentAccount.address }),
    });
    
    const { data: messageData } = await messageResponse.json();
    const message = new Uint8Array(messageData.message);

    // 2. Sign message with wallet
    const { signature } = await signPersonalMessage({ message });

    // 3. Decrypt file
    const decryptResponse = await fetch('http://localhost:3000/api/seal/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadataBlobId,
        address: currentAccount.address,
        signature,
      }),
    });

    // 4. Download decrypted file
    const blob = await decryptResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decrypted-file';
    a.click();
    
    console.log('✅ File decrypted and downloaded!');
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleEncrypt(e.target.files[0])} />
      <button onClick={() => handleDecrypt('your-metadata-blob-id')}>
        Decrypt File
      </button>
    </div>
  );
};
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `500` - Server error (encryption/decryption failed)

---

## Security Notes

⚠️ **Important:**
- The `metadataBlobId` is the ONLY thing users need to store
- No backup keys are stored on Walrus (for security)
- Users MUST have wallet access to decrypt files
- Decryption requires valid signature from whitelisted address
