import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SealWalrusService } from '../../services/SealWalrusService';
import { Strategy } from '../../types/strategy';
import { SessionKey } from '@mysten/seal';

const router: ExpressRouter = Router();

// Initialize Sui client and service
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const sealWalrusService = new SealWalrusService(suiClient);

// In-memory storage for marketplace (en production, utilisez une vraie DB)
interface MarketplaceWorkflow {
  id: string;
  metadataBlobId: string;
  strategy: Strategy;
  purchasedBy: string[]; // Liste des adresses qui ont acheté
  createdAt: number;
}

const marketplaceWorkflows: MarketplaceWorkflow[] = [];

// Store session keys for decrypt flow
const sessionKeys = new Map<string, SessionKey>();

/**
 * POST /api/workflows/upload
 * Upload et encrypt un workflow sur Walrus
 * Body: JSON du workflow (Strategy)
 */
router.post('/workflows/upload', async (req: Request, res: Response) => {
  try {
    const strategy: Strategy = req.body;

    if (!strategy || !strategy.id || !strategy.meta) {
      return res.status(400).json({ error: 'Invalid workflow data' });
    }

    // Valider que le workflow est bien formé
    if (!strategy.nodes || !Array.isArray(strategy.nodes)) {
      return res.status(400).json({ error: 'Workflow must contain nodes array' });
    }

    // Convertir le workflow en JSON
    const workflowJson = JSON.stringify(strategy);
    const workflowBuffer = Buffer.from(workflowJson, 'utf-8');

    console.log('📤 Uploading workflow to Walrus (encrypted):', strategy.meta.name);

    // Encrypt et stocker sur Walrus
    const result = await sealWalrusService.encryptAndStore(
      workflowBuffer,
      `${strategy.meta.name}.json`
    );

    // Ajouter à la marketplace
    const marketplaceEntry: MarketplaceWorkflow = {
      id: strategy.id,
      metadataBlobId: result.metadataBlobId,
      strategy,
      purchasedBy: [],
      createdAt: Date.now(),
    };

    marketplaceWorkflows.push(marketplaceEntry);

    console.log('✅ Workflow uploaded and encrypted');

    res.json({
      success: true,
      data: {
        id: strategy.id,
        workflowId: strategy.id,
        metadataBlobId: result.metadataBlobId,
        dataBlobId: result.dataBlobId,
        walrusUrls: {
          metadata: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.metadataBlobId}`,
          data: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.dataBlobId}`,
        },
      },
    });
  } catch (error: any) {
    console.error('Workflow upload error:', error);
    res.status(500).json({
      error: 'Failed to upload workflow',
      message: error.message,
    });
  }
});

/**
 * GET /api/workflows/list
 * Liste tous les workflows disponibles dans la marketplace
 */
router.get('/workflows/list', async (req: Request, res: Response) => {
  try {
    // Retourner les métadonnées publiques (pas le contenu encrypté)
    const workflows = marketplaceWorkflows.map((w) => ({
      id: w.id,
      metadataBlobId: w.metadataBlobId,
      name: w.strategy.meta.name,
      author: w.strategy.meta.author,
      description: w.strategy.meta.description,
      tags: w.strategy.meta.tags,
      created_at: w.strategy.meta.created_at,
      purchaseCount: w.purchasedBy.length,
      createdAt: w.createdAt,
    }));

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error: any) {
    console.error('Workflow list error:', error);
    res.status(500).json({
      error: 'Failed to list workflows',
      message: error.message,
    });
  }
});

/**
 * POST /api/workflows/purchase
 * Marquer un workflow comme acheté (l'utilisateur doit déjà être dans la whitelist)
 * Body: { workflowId, address }
 */
router.post('/workflows/purchase', async (req: Request, res: Response) => {
  try {
    const { workflowId, address } = req.body;

    if (!workflowId || !address) {
      return res.status(400).json({
        error: 'Missing required fields: workflowId, address',
      });
    }

    // Trouver le workflow
    const workflow = marketplaceWorkflows.find((w) => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Vérifier si déjà acheté
    if (workflow.purchasedBy.includes(address)) {
      return res.status(400).json({
        error: 'You already own this workflow',
      });
    }

    console.log('🛒 Processing purchase for workflow:', workflowId);
    console.log('   User:', address);
    console.log('   Note: User should already be in whitelist (paid 0.5 SUI)');

    // Marquer comme acheté
    workflow.purchasedBy.push(address);

    res.json({
      success: true,
      data: {
        workflowId: workflow.id,
        metadataBlobId: workflow.metadataBlobId,
        message: 'Workflow purchased successfully. You can now decrypt it.',
      },
    });
  } catch (error: any) {
    console.error('Workflow purchase error:', error);
    res.status(500).json({
      error: 'Failed to purchase workflow',
      message: error.message,
    });
  }
});

/**
 * POST /api/workflows/get-decrypt-message
 * Obtenir le message à signer pour décrypter un workflow
 * Note: L'utilisateur doit être dans la whitelist (avoir payé 0.5 SUI)
 */
router.post('/workflows/get-decrypt-message', async (req: Request, res: Response) => {
  try {
    const { workflowId, address } = req.body;

    if (!workflowId || !address) {
      return res.status(400).json({
        error: 'Missing required fields: workflowId, address',
      });
    }

    // Trouver le workflow
    const workflow = marketplaceWorkflows.find((w) => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Vérifier que l'utilisateur a acheté le workflow
    if (!workflow.purchasedBy.includes(address)) {
      return res.status(403).json({
        error: 'You must purchase this workflow first',
      });
    }

    console.log('🔑 Creating session key for decrypt...');
    console.log('   User:', address);
    console.log('   Note: Seal will verify whitelist on-chain during decrypt');

    // Créer une session key pour le decrypt
    const sessionKey = await sealWalrusService.createSessionKey(address);
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Stocker la session key en mémoire
    sessionKeys.set(sessionId, sessionKey);

    console.log('🔑 Created session key for decrypt:', sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        message: Array.from(sessionKey.getPersonalMessage()),
        messageHex: Buffer.from(sessionKey.getPersonalMessage()).toString('hex'),
      },
    });
  } catch (error: any) {
    console.error('Get decrypt message error:', error);
    res.status(500).json({
      error: 'Failed to create decrypt message',
      message: error.message,
    });
  }
});

/**
 * POST /api/workflows/decrypt
 * Décrypter un workflow acheté
 */
router.post('/workflows/decrypt', async (req: Request, res: Response) => {
  try {
    const { workflowId, address, sessionId, signature } = req.body;

    if (!workflowId || !address || !sessionId || !signature) {
      return res.status(400).json({
        error: 'Missing required fields: workflowId, address, sessionId, signature',
      });
    }

    // Trouver le workflow
    const workflow = marketplaceWorkflows.find((w) => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Vérifier que l'utilisateur a acheté le workflow
    if (!workflow.purchasedBy.includes(address)) {
      return res.status(403).json({
        error: 'You must purchase this workflow first',
      });
    }

    // Récupérer la session key
    const sessionKey = sessionKeys.get(sessionId);
    if (!sessionKey) {
      return res.status(400).json({
        error: 'Invalid or expired session',
      });
    }

    console.log('🔓 Decrypting workflow:', workflowId);

    // Décrypter depuis Walrus
    const decryptedData = await sealWalrusService.decryptFromWalrus(
      workflow.metadataBlobId,
      sessionKey,
      signature,
      address
    );

    // Parser le JSON
    const workflowJson = JSON.parse(decryptedData.toString('utf-8'));

    // Nettoyer la session key
    sessionKeys.delete(sessionId);

    res.json({
      success: true,
      data: {
        workflow: workflowJson,
      },
    });
  } catch (error: any) {
    console.error('Workflow decrypt error:', error);
    res.status(500).json({
      error: 'Failed to decrypt workflow',
      message: error.message,
    });
  }
});

/**
 * GET /api/workflows/owned/:address
 * Liste tous les workflows possédés par une adresse
 */
router.get('/workflows/owned/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const ownedWorkflows = marketplaceWorkflows
      .filter((w) => w.purchasedBy.includes(address))
      .map((w) => ({
        id: w.id,
        metadataBlobId: w.metadataBlobId,
        name: w.strategy.meta.name,
        author: w.strategy.meta.author,
        description: w.strategy.meta.description,
        tags: w.strategy.meta.tags,
        created_at: w.strategy.meta.created_at,
      }));

    res.json({
      success: true,
      data: ownedWorkflows,
    });
  } catch (error: any) {
    console.error('Owned workflows error:', error);
    res.status(500).json({
      error: 'Failed to fetch owned workflows',
      message: error.message,
    });
  }
});

export default router;
