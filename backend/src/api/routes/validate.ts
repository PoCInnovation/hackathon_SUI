
import { Router, Request, Response } from 'express';
import { TransactionBuilder } from '../../core/transaction-builder';
import { Strategy } from '../../types/strategy';

const router: Router = Router();

router.post('/validate', (req: Request, res: Response): void => {
  try {
    const { strategy } = req.body;

    if (!strategy) {
      res.status(400).json({ 
        valid: false, 
        errors: ['Missing strategy in request body'] 
      });
      return;
    }

    const validation = TransactionBuilder.validate(strategy as Strategy);

    res.json({
      valid: validation.success,
      errors: validation.errors,
      warnings: validation.warnings
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    res.status(500).json({
      valid: false,
      errors: [{
        rule_id: 'api_error',
        severity: 'ERROR',
        message: error.message || 'Internal server error'
      }]
    });
  }
});

export default router;
