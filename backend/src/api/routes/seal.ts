import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SealWalrusService } from '../../services/SealWalrusService';
import { ADMIN_CONFIG } from '../../config/admin';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Sui client and service
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const sealWalrusService = new SealWalrusService(suiClient);

/**
 * GET /api/seal/health
 * Health check endpoint
 */
router.get('/seal/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Seal API is healthy' });
});

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

    // Create session key
    const sessionKey = await sealWalrusService.createSessionKey(address);

    const decrypted = await sealWalrusService.decryptFromWalrus(
      metadataBlobId,
      sessionKey,
      signature,
      address
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
      packageId: '0x0fe074f026b27ea8617d326dc732b635a762bb64e23b943bafc7ac49f8e9eb52',
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

/**
 * POST /api/seal/build-whitelist-payment
 * Construire une transaction pour payer et rejoindre la whitelist Seal
 * Body: { address }
 * Returns: transaction bytes à signer
 */
router.post('/seal/build-whitelist-payment', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Missing required field: address',
      });
    }

    const WHITELIST_PRICE_SUI = 0.5;
    const WHITELIST_PRICE_MIST = 500_000_000; // 0.5 SUI

    // Check if user is already whitelisted
    try {
      const whitelistObj = await suiClient.getObject({
        id: ADMIN_CONFIG.WHITELIST_ID,
        options: { showContent: true },
      });

      if (whitelistObj.data?.content?.dataType === 'moveObject') {
        const content = whitelistObj.data.content as any;
        const addressesTableId = content.fields.addresses.fields.id.id;

        const dynamicField = await suiClient.getDynamicFieldObject({
          parentId: addressesTableId,
          name: {
            type: 'address',
            value: address,
          },
        });

        if (dynamicField.data) {
          return res.status(400).json({
            error: 'User is already in the whitelist',
          });
        }
      }
    } catch (e) {
      // Ignore error if dynamic field not found (means user is not whitelisted)
    }

    console.log('💰 Building whitelist payment transaction:');
    console.log('   User:', address);
    console.log('   Price:', WHITELIST_PRICE_SUI, 'SUI');

    // Construire la transaction
    const tx = new Transaction();
    
    // Split coins pour le paiement
    const [paymentCoin] = tx.splitCoins(tx.gas, [WHITELIST_PRICE_MIST]);
    
    // Appeler add_self_with_payment
    tx.moveCall({
      target: `${ADMIN_CONFIG.PACKAGE_ID}::whitelist::add_self_with_payment`,
      arguments: [
        tx.object(ADMIN_CONFIG.WHITELIST_ID),
        paymentCoin,
      ],
    });

    // Définir le sender
    tx.setSender(address);

    // Sérialiser la transaction
    const txBytes = await tx.build({ client: suiClient });

    res.json({
      success: true,
      data: {
        transactionBytes: Array.from(txBytes),
        price_sui: WHITELIST_PRICE_SUI,
        price_mist: WHITELIST_PRICE_MIST,
      },
    });
  } catch (error: any) {
    console.error('Build whitelist payment error:', error);
    res.status(500).json({
      error: 'Failed to build whitelist payment transaction',
      message: error.message,
    });
  }
});

/**
 * POST /api/seal/confirm-whitelist-payment
 * Confirmer le paiement de la whitelist
 * Body: { address, transactionDigest }
 */
router.post('/seal/confirm-whitelist-payment', async (req: Request, res: Response) => {
  try {
    const { address, transactionDigest } = req.body;

    if (!address || !transactionDigest) {
      return res.status(400).json({
        error: 'Missing required fields: address, transactionDigest',
      });
    }

    console.log('🔍 Verifying whitelist payment:', transactionDigest);

    // Vérifier que la transaction existe et est réussie
    const txResult = await suiClient.getTransactionBlock({
      digest: transactionDigest,
      options: {
        showEffects: true,
      },
    });

    if (!txResult.effects || txResult.effects.status.status !== 'success') {
      return res.status(400).json({
        error: 'Transaction failed or not found',
      });
    }

    console.log('✅ Whitelist payment confirmed!');

    res.json({
      success: true,
      data: {
        address,
        transactionDigest,
        message: 'Successfully added to whitelist',
      },
    });
  } catch (error: any) {
    console.error('Confirm whitelist payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm whitelist payment',
      message: error.message,
    });
  }
});

/**
 * GET /api/seal/whitelist-price
 * Obtenir le prix de la whitelist
 */
router.get('/seal/whitelist-price', async (req: Request, res: Response) => {
  try {
    const WHITELIST_PRICE_SUI = 0.5;
    const WHITELIST_PRICE_MIST = 500_000_000;

    res.json({
      success: true,
      data: {
        price_sui: WHITELIST_PRICE_SUI,
        price_mist: WHITELIST_PRICE_MIST,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get whitelist price',
      message: error.message,
    });
  }
});

/**
 * POST /api/seal/build-template-purchase
 * Construire une transaction pour acheter l'accès à une template spécifique
 * Body: { address, templateIndex }
 * Returns: transaction bytes à signer
 */
router.post('/seal/build-template-purchase', async (req: Request, res: Response) => {
  try {
    const { address, templateIndex } = req.body;

    if (!address || templateIndex === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: address, templateIndex',
      });
    }

    // Fetch the template to get its price
    const whitelistObj = await suiClient.getObject({
      id: ADMIN_CONFIG.WHITELIST_ID,
      options: { showContent: true },
    });

    if (!whitelistObj.data?.content || whitelistObj.data.content.dataType !== 'moveObject') {
      throw new Error('Failed to fetch whitelist object');
    }

    const content = whitelistObj.data.content as any;
    const templates = content.fields.templates || [];

    if (templateIndex >= templates.length) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[templateIndex];
    const templatePrice = BigInt(template.fields.price); // Already in MIST

    console.log('💰 Building template purchase transaction:');
    console.log('   User:', address);
    console.log('   Template:', template.fields.name);
    console.log('   Price:', Number(templatePrice) / 1_000_000_000, 'SUI');
    console.log('   Template Index:', templateIndex);

    // Construire la transaction
    const tx = new Transaction();

    // Split coins pour le paiement
    const [paymentCoin] = tx.splitCoins(tx.gas, [templatePrice]);

    // Appeler buy_template_access
    tx.moveCall({
      target: `${ADMIN_CONFIG.PACKAGE_ID}::whitelist::buy_template_access`,
      arguments: [
        tx.object(ADMIN_CONFIG.WHITELIST_ID),
        tx.pure.u64(templateIndex),
        paymentCoin,
      ],
    });

    // Définir le sender
    tx.setSender(address);

    // Sérialiser la transaction
    const txBytes = await tx.build({ client: suiClient });

    res.json({
      success: true,
      data: {
        transactionBytes: Array.from(txBytes),
        templateName: template.fields.name,
        price_sui: Number(templatePrice) / 1_000_000_000,
        price_mist: Number(templatePrice),
        templateIndex,
      },
    });
  } catch (error: any) {
    console.error('Build template purchase error:', error);
    res.status(500).json({
      error: 'Failed to build template purchase transaction',
      message: error.message,
    });
  }
});

/**
 * POST /api/seal/confirm-template-purchase
 * Confirmer l'achat d'une template
 * Body: { address, templateIndex, transactionDigest }
 */
router.post('/seal/confirm-template-purchase', async (req: Request, res: Response) => {
  try {
    const { address, templateIndex, transactionDigest } = req.body;

    if (!address || templateIndex === undefined || !transactionDigest) {
      return res.status(400).json({
        error: 'Missing required fields: address, templateIndex, transactionDigest',
      });
    }

    console.log('🔍 Verifying template purchase:', transactionDigest);

    // Vérifier que la transaction existe et est réussie
    const txResult = await suiClient.getTransactionBlock({
      digest: transactionDigest,
      options: {
        showEffects: true,
      },
    });

    if (!txResult.effects || txResult.effects.status.status !== 'success') {
      return res.status(400).json({
        error: 'Transaction failed or not found',
      });
    }

    console.log('✅ Template purchase confirmed!');

    res.json({
      success: true,
      data: {
        address,
        templateIndex,
        transactionDigest,
        message: 'Successfully purchased template access',
      },
    });
  } catch (error: any) {
    console.error('Confirm template purchase error:', error);
    res.status(500).json({
      error: 'Failed to confirm template purchase',
      message: error.message,
    });
  }
});

/**
 * GET /api/seal/check-template-access/:address/:templateId
 * Vérifier si un utilisateur a accès à une template
 */
router.get('/seal/check-template-access/:address/:templateId', async (req: Request, res: Response) => {
  try {
    const { address, templateId } = req.params;

    // Fetch whitelist object
    const whitelistObj = await suiClient.getObject({
      id: ADMIN_CONFIG.WHITELIST_ID,
      options: { showContent: true },
    });

    if (!whitelistObj.data?.content || whitelistObj.data.content.dataType !== 'moveObject') {
      throw new Error('Failed to fetch whitelist object');
    }

    const content = whitelistObj.data.content as any;
    const templateAccessTableId = content.fields.template_access.fields.id.id;

    // Check if there's an access table for this template
    try {
      const templateAccessField = await suiClient.getDynamicFieldObject({
        parentId: templateAccessTableId,
        name: {
          type: '0x2::object::ID',
          value: templateId,
        },
      });

      if (!templateAccessField.data) {
        // No access table for this template
        return res.json({ success: true, data: { hasAccess: false } });
      }

      // Now check if the address is in the access table
      const accessTableContent = templateAccessField.data.content as any;
      const addressesTableId = accessTableContent.fields.value.fields.id.id;

      const addressField = await suiClient.getDynamicFieldObject({
        parentId: addressesTableId,
        name: {
          type: 'address',
          value: address,
        },
      });

      const hasAccess = !!addressField.data;

      res.json({
        success: true,
        data: { hasAccess },
      });
    } catch (error) {
      // If dynamic field not found, user doesn't have access
      res.json({
        success: true,
        data: { hasAccess: false },
      });
    }
  } catch (error: any) {
    console.error('Check template access error:', error);
    res.status(500).json({
      error: 'Failed to check template access',
      message: error.message,
    });
  }
});

/**
 * GET /api/seal/check-user-templates/:address
 * Récupérer tous les templates qu'un utilisateur possède
 * Returns: liste des template IDs
 */
router.get('/seal/check-user-templates/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Fetch whitelist to get all templates
    const whitelistObj = await suiClient.getObject({
      id: ADMIN_CONFIG.WHITELIST_ID,
      options: { showContent: true },
    });

    if (!whitelistObj.data?.content || whitelistObj.data.content.dataType !== 'moveObject') {
      throw new Error('Failed to fetch whitelist object');
    }

    const content = whitelistObj.data.content as any;
    const templates = content.fields.templates || [];
    const templateAccessTableId = content.fields.template_access.fields.id.id;

    // Check each template to see if user has access
    const ownedTemplates = [];

    for (const template of templates) {
      try {
        // Check if user is in this template's access list
        const templateAccessField = await suiClient.getDynamicFieldObject({
          parentId: templateAccessTableId,
          name: {
            type: '0x2::object::ID',
            value: template.fields.id,
          },
        });

        if (templateAccessField.data) {
          const accessTable = templateAccessField.data.content as any;
          const userAccessTableId = accessTable.fields.value.fields.id.id;

          // Check if user address is in the access table
          try {
            const userAccessField = await suiClient.getDynamicFieldObject({
              parentId: userAccessTableId,
              name: {
                type: 'address',
                value: address,
              },
            });

            if (userAccessField.data) {
              // User has access to this template
              ownedTemplates.push({
                templateId: template.fields.id,
                name: template.fields.name,
                author: template.fields.author,
                description: template.fields.description,
                price: Number(template.fields.price) / 1_000_000_000,
                metadataBlobId: template.fields.metadata_blob_id,
                dataBlobId: template.fields.data_blob_id,
              });
            }
          } catch (error) {
            // User doesn't have access to this template, continue
          }
        }
      } catch (error) {
        // Template has no purchases yet, continue
      }
    }

    res.json({
      success: true,
      data: ownedTemplates,
    });
  } catch (error: any) {
    console.error('Check user templates error:', error);
    res.status(500).json({
      error: 'Failed to check user templates',
      message: error.message,
    });
  }
});

export default router;
