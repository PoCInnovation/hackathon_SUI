
import { Router, Request, Response } from 'express';
import { Simulator } from '../../core/simulator';
import { Strategy } from '../../types/strategy';

const router = Router();

// Initialize simulator with Testnet by default (can be configured via env)
const simulator = new Simulator('testnet'); // Using testnet as default for testing

router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { strategy, sender } = req.body;

    if (!strategy || !sender) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing strategy or sender in request body' 
      });
      return;
    }

    // Run simulation
    const result = await simulator.simulate(strategy as Strategy, sender);

    res.json(result);
  } catch (error: any) {
    console.error('Simulation error:', error);
    res.status(500).json({
      success: false,
      estimated_gas: 0,
      estimated_profit_loss: [],
      errors: [{
        rule_id: 'api_error',
        severity: 'ERROR',
        message: error.message || 'Internal server error'
      }]
    });
  }
});

export default router;

