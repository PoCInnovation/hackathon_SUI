/**
 * Execution Step Details
 * Tracks individual strategy operations (Flash Borrow, Swap, Flash Repay)
 */

export interface ExecutionStepDetail {
  id: string;                              // Unique step identifier
  order: number;                           // Order in sequence (1, 2, 3, etc.)
  type: 'FLASH_BORROW' | 'DEX_SWAP' | 'FLASH_REPAY' | 'COIN_MERGE' | 'COIN_SPLIT' | 'CUSTOM'; // Step type
  protocol: string;                        // Protocol name (NAVI, CETUS, DEEPBOOK, etc.)
  status: 'pending' | 'executing' | 'success' | 'error'; // Step execution status
  startTime?: number;                      // Timestamp when step started
  endTime?: number;                        // Timestamp when step completed
  duration?: number;                       // Duration in milliseconds

  // Inputs
  inputs?: {
    coinType?: string;                     // Full coin type address (0x::sui::SUI)
    amount?: string;                       // Amount in MIST
    amountDisplay?: string;                // Human readable (e.g., "1.50 SUI")
    pool?: string;                         // Pool ID for swaps
    direction?: 'A2B' | 'B2A';            // Swap direction
    receipt?: string;                      // Flash loan receipt indicator
  };

  // Outputs & Results
  outputs?: {
    coinType?: string;
    amount?: string;
    amountDisplay?: string;
    received?: boolean;
  };

  // Gas & Cost
  gas?: {
    estimatedGas?: number;                 // In MIST
    actualGas?: number;                    // In MIST (after execution)
    gasDisplay?: string;                   // Human readable (e.g., "0.01 SUI")
  };

  // Profit/Loss
  profitLoss?: {
    token?: string;                        // Token symbol
    amount?: string;                       // In MIST
    amountDisplay?: string;                // Human readable
    isProfit?: boolean;
  };

  // Error Details
  error?: {
    message: string;
    code?: string;
    details?: string;
  };

  // Additional metadata
  metadata?: Record<string, any>;
  logs?: string[];                         // Step-specific logs
}

/**
 * Updated Execution History Entry with Step Details
 */
export interface ExecutionHistoryEntry {
  id: string;
  timestamp: number;
  date: string;
  strategyId: string;
  strategyName: string;
  strategyDescription: string;
  status: 'success' | 'error';
  txDigest?: string;
  network: string;
  sender: string;
  logs: Array<{
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>;
  effects?: any;

  // NEW: Step-by-step execution details
  executionSteps?: ExecutionStepDetail[];

  // Summary stats
  stats?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;               // In milliseconds
    totalGasUsed?: string;               // In MIST
    totalGasDisplay?: string;            // Human readable
    netProfitLoss?: string;              // In MIST
    netProfitLossDisplay?: string;       // Human readable
  };
}

export type ExecutionStatus = 'idle' | 'building' | 'signing' | 'executing' | 'success' | 'error';

export interface Log {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
