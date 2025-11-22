/**
 * DEX Adapter Interface
 *
 * Standardized interface for all DEX protocols.
 * Each protocol (Cetus, DeepBook, Turbos, Aftermath) implements this interface.
 */

import { Transaction } from "@mysten/sui/transactions";
import { DexSwapNode } from "../../types/strategy";

/**
 * Swap simulation/estimation result
 */
export interface SwapEstimate {
  amount_in: string;             // Input amount
  amount_out: string;            // Estimated output amount
  price_impact: string;          // Price impact percentage
  fee: string;                   // Protocol fee amount
  sqrt_price_limit?: string;     // For CLMM protocols
  amount_limit?: string;         // Min output / max input for slippage
  pool_coin_type_a?: string;     // Actual pool coin type A
  pool_coin_type_b?: string;     // Actual pool coin type B
  is_inverted?: boolean;         // True if pool coins are inverted relative to params
}

/**
 * Standard interface all DEX adapters must implement
 */
export interface DexAdapter {
  /**
   * Protocol name
   */
  readonly protocol: string;

  /**
   * Simulate swap to get estimates
   * MUST be called before swap() for accurate slippage protection
   *
   * @param node - DEX swap node from strategy
   * @param estimatedInputAmount - Optional estimated input amount (for chained swaps with "ALL")
   * @returns Swap estimate
   */
  preSwap(node: DexSwapNode, estimatedInputAmount?: string): Promise<SwapEstimate>;

  /**
   * Add swap transaction to PTB
   *
   * @param tx - Transaction block
   * @param node - DEX swap node from strategy
   * @param coinIn - Input coin (from result cache)
   * @param estimate - Pre-swap estimate (from preSwap)
   * @returns Output coin
   */
  swap(tx: Transaction, node: DexSwapNode, coinIn: any, estimate: SwapEstimate): any;

  /**
   * Calculate slippage-adjusted amount limit
   *
   * @param estimate - Swap estimate
   * @param slippageTolerance - Slippage tolerance (e.g., "0.05" for 5%)
   * @param isInput - True for max input, false for min output
   * @returns Amount limit
   */
  calculateAmountLimit(estimate: SwapEstimate, slippageTolerance: string, isInput: boolean): string;
}

/**
 * Base adapter class with common functionality
 */
export abstract class BaseDexAdapter implements DexAdapter {
  abstract readonly protocol: string;

  abstract preSwap(node: DexSwapNode, estimatedInputAmount?: string): Promise<SwapEstimate>;
  abstract swap(tx: Transaction, node: DexSwapNode, coinIn: any, estimate: SwapEstimate): any;

  calculateAmountLimit(estimate: SwapEstimate, slippageTolerance: string, isInput: boolean): string {
    const slippage = parseFloat(slippageTolerance);

    if (isInput) {
      // Max input = estimated input * (1 + slippage)
      const amountIn = BigInt(estimate.amount_in);
      const maxInput = (amountIn * BigInt(Math.floor((1 + slippage) * 1000000))) / BigInt(1000000);
      return maxInput.toString();
    } else {
      // Min output = estimated output * (1 - slippage)
      const amountOut = BigInt(estimate.amount_out);
      const minOutput = (amountOut * BigInt(Math.floor((1 - slippage) * 1000000))) / BigInt(1000000);
      return minOutput.toString();
    }
  }
}
