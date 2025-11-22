import { Router, Request, Response } from 'express';
import { TransactionBuilder } from '../../core/transaction-builder';
import { Strategy } from '../../types/strategy';

const router: Router = Router();

/**
 * Build a transaction from a strategy
 * Returns the transaction bytes that can be signed and executed
 */
router.post('/build', async (req: Request, res: Response): Promise<void> => {
  try {
    const { strategy, sender } = req.body;

    if (!strategy || !sender) {
      res.status(400).json({
        error: 'Missing strategy or sender in request body'
      });
      return;
    }

    // Build the transaction
    const builder = new TransactionBuilder();
    const tx = await builder.buildFromStrategy(strategy as Strategy);

    // Set the sender
    tx.setSender(sender);

    // Serialize the transaction to bytes
    const txBytes = await tx.build({
      client: undefined as any,
      onlyTransactionKind: false
    });

    // Return the transaction bytes as base64
    res.json({
      success: true,
      transactionBytes: Buffer.from(txBytes).toString('base64'),
      sender
    });

  } catch (error: any) {
    console.error('Build error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build transaction'
    });
  }
});

export default router;
