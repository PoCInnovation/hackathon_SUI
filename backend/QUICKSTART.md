# Seal + Walrus Integration - Quick Start

## 🚀 Backend Setup

### 1. Start the API Server

```bash
cd backend
pnpm install
pnpm start:dev  # Dev mode with hot reload
```

Le serveur démarre sur `http://localhost:3000`

### 2. Test les endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Encrypt un fichier:**
```bash
curl -X POST http://localhost:3000/api/seal/encrypt \
  -F "file=@./test-file.txt"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "metadataBlobId": "stliAtxMGFk9we0dHwu8HtU9yZy2zPzhAd6FC7tVrrY",
    "dataBlobId": "P3NLt_Es98PVY8CNWF8KN7JsZLcuI4dDy3QMPaVp6pE",
    "nonce": "file-1763822121154",
    "originalSize": 57
  }
}
```

---

## 📱 Frontend Integration

### 1. Copier le hook dans votre projet

```
frontend/src/hooks/useSealEncryption.tsx
```

### 2. Utiliser dans un composant

```tsx
import { useSealEncryption } from '@/hooks/useSealEncryption';

function MyComponent() {
  const { encryptFile, decryptFile } = useSealEncryption();

  const handleUpload = async (file: File) => {
    const metadataBlobId = await encryptFile(file);
    // Sauvegarder metadataBlobId dans votre DB
  };

  const handleDownload = async (metadataBlobId: string) => {
    await decryptFile(metadataBlobId);
  };

  return (
    <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
  );
}
```

---

## 🎯 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/seal/encrypt` | POST | Encrypt & upload file |
| `/api/seal/decrypt` | POST | Decrypt & download file |
| `/api/seal/session-message` | POST | Get message to sign |
| `/api/seal/metadata/:blobId` | GET | Get file metadata |

**Voir [SEAL_API.md](./SEAL_API.md) pour la doc complète**

---

## 📂 Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   └── seal.ts          # Routes Seal + Walrus
│   │   └── server.ts            # Express server
│   ├── services/
│   │   └── SealWalrusService.ts # Business logic
│   └── examples/
│       ├── frontend-hooks/
│       │   └── useSealEncryption.tsx
│       └── frontend-components/
│           └── FileUploadExample.tsx
├── encrypt-and-store-walrus.mjs # CLI script
├── decrypt-from-walrus.mjs      # CLI script
└── SEAL_API.md                  # Full API documentation
```

---

## 🔑 Configuration

**Backend:**
- Package ID: `0x62d5d773ee18880e3ec80a8f6beaee30e1cd961cbbf4c712959ce63f9893fd88`
- Whitelist ID: `0x63090ed01c52e4963a31a6b27e91f5608bd297b1b3a5b3e63e4d8191540251be`
- Walrus: Testnet

**Frontend:**
- Set `VITE_API_URL=http://localhost:3000/api` dans `.env`

---

## ✅ What's Working

✅ **Backend:**
- Express API avec routes Seal + Walrus
- Multipart file upload (multer)
- Encryption/Decryption avec Seal IBE
- Storage/Retrieval sur Walrus
- CORS activé pour frontend

✅ **CLI Scripts:**
- `encrypt-and-store-walrus.mjs` - Encrypt + store
- `decrypt-from-walrus.mjs` - Decrypt + download

✅ **Frontend Examples:**
- React Hook `useSealEncryption`
- Composant exemple avec UI

---

## 🎉 C'est Prêt !

Vous avez maintenant:
1. ✅ Backend API Express avec Seal + Walrus
2. ✅ Frontend hook React prêt à l'emploi
3. ✅ Documentation complète
4. ✅ Exemples de code

**Next Steps:**
1. Start backend: `pnpm start:dev`
2. Copier le hook dans votre frontend
3. Connecter avec @mysten/dapp-kit
4. Enjoy! 🚀
