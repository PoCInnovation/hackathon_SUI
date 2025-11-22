import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SealWalrusService } from '../../services/SealWalrusService';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Sui client and service
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const sealWalrusService = new SealWalrusService(suiClient);

/**
 * POST /api/seal/encrypt
 * Encrypt a file and store on Walrus
 * Body: multipart/form-data with 'file' field
 * Returns: { metadataBlobId, dataBlobId, nonce, originalSize }
 */
router.post('/seal/encrypt', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await sealWalrusService.encryptAndStore(
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      data: result,
      walrusUrls: {
        metadata: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.metadataBlobId}`,
        data: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.dataBlobId}`,
      }
    });
  } catch (error: any) {
    console.error('Encryption error:', error);
    res.status(500).json({ 
      error: 'Failed to encrypt and store file',
      message: error.message 
    });
  }
});

/**
 * POST /api/seal/decrypt
 * Decrypt a file from Walrus
 * Body: { metadataBlobId, address, signature }
 * Returns: decrypted file as buffer
 */
router.post('/seal/decrypt', async (req: Request, res: Response) => {
  try {
    const { metadataBlobId, address, signature } = req.body;

    if (!metadataBlobId || !address || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields: metadataBlobId, address, signature' 
      });
    }

    // Create a simple sign function that returns the provided signature
    const signPersonalMessage = async (message: Uint8Array): Promise<string> => {
      return signature;
    };

    const decrypted = await sealWalrusService.decryptFromWalrus(
      metadataBlobId,
      address,
      signPersonalMessage
    );

    // Get metadata to set correct filename
    const metadata = await sealWalrusService.getMetadata(metadataBlobId);
    const filename = metadata.originalFilename || 'decrypted-file';

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(decrypted);
  } catch (error: any) {
    console.error('Decryption error:', error);
    res.status(500).json({ 
      error: 'Failed to decrypt file',
      message: error.message 
    });
  }
});

/**
 * GET /api/seal/metadata/:blobId
 * Get metadata for a blob
 * Returns: metadata object
 */
router.get('/seal/metadata/:blobId', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.params;
    const metadata = await sealWalrusService.getMetadata(blobId);
    res.json({ success: true, data: metadata });
  } catch (error: any) {
    console.error('Metadata fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metadata',
      message: error.message 
    });
  }
});

/**
 * POST /api/seal/session-message
 * Get the personal message to sign for creating a session key
 * Body: { address }
 * Returns: { message: Uint8Array }
 */
router.post('/seal/session-message', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Missing address' });
    }

    const { SessionKey } = await import('@mysten/seal');
    
    const sessionKey = await SessionKey.create({
      address,
      packageId: '0x62d5d773ee18880e3ec80a8f6beaee30e1cd961cbbf4c712959ce63f9893fd88',
      ttlMin: 10,
      suiClient,
    });

    const personalMessage = sessionKey.getPersonalMessage();

    res.json({ 
      success: true,
      data: {
        message: Array.from(personalMessage),
        messageHex: Buffer.from(personalMessage).toString('hex')
      }
    });
  } catch (error: any) {
    console.error('Session message error:', error);
    res.status(500).json({ 
      error: 'Failed to create session message',
      message: error.message 
    });
  }
});

export default router;
