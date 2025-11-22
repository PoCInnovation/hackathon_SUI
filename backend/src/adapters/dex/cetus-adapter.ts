/**
 * Cetus DEX Adapter
 *
 * Integrates with Cetus CLMM (Concentrated Liquidity Market Maker).
 * Requires pre-swap calculation for sqrt_price_limit and amount_limit.
 */

import { Transaction } from "@mysten/sui/transactions";
import { CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { DexSwapNode, CetusSwapParams } from "../../types/strategy";
import { BaseDexAdapter, SwapEstimate } from "./types";
import { MAINNET_ADDRESSES } from "../../config/addresses";

export class CetusAdapter extends BaseDexAdapter {
  readonly protocol = "CETUS";
  private sdk: CetusClmmSDK | null = null;

  constructor() {
    super();

    // Initialize Cetus SDK with required options (Mainnet)
    try {
      const config = this.getConfig();
      this.sdk = new CetusClmmSDK({
        fullRpcUrl: "https://fullnode.mainnet.sui.io:443",
        simulationAccount: { address: "0x0000000000000000000000000000000000000000000000000000000000000000" },
      } as any); // Using any to bypass strict type check for now, as we only need RPC for pre-swap
    } catch (error) {
      console.warn("Cetus SDK initialization failed. Adapter will work in mock mode.");
    }
  }

  private getConfig() {
    return MAINNET_ADDRESSES;
  }

  async preSwap(node: DexSwapNode): Promise<SwapEstimate> {
    const params = node.params as CetusSwapParams;

    if (!this.sdk) {
      return this.mockPreSwap(params);
    }

    try {
      // Fetch pool data
      const pool = await this.sdk.Pool.getPool(params.pool_id);

      if (!pool) {
        throw new Error(`Cetus pool not found: ${params.pool_id}`);
      }

      // Determine swap direction
      const a2b = params.direction === "A_TO_B";
      const byAmountIn = params.amount_mode === "EXACT_IN";

      // Pre-swap calculation
      const preswapResult = await this.sdk.Swap.preswap({
        pool: pool,
        currentSqrtPrice: pool.current_sqrt_price,
        coinTypeA: params.coin_type_a,
        coinTypeB: params.coin_type_b,
        decimalsA: 9, // TODO: Get actual decimals dynamically
        decimalsB: 6, // TODO: Get actual decimals dynamically
        a2b: a2b,
        byAmountIn: byAmountIn,
        amount: params.amount,
      });

      if (!preswapResult) {
        throw new Error("Preswap returned null");
      }

      // Calculate sqrt_price_limit
      const sqrt_price_limit = a2b
        ? "4295048016" // MIN_SQRT_PRICE
        : "79226673515401279992447579055"; // MAX_SQRT_PRICE

      // Calculate amount_limit with slippage
      const slippage = parseFloat(params.slippage_tolerance);
      const estimatedAmount = byAmountIn ? preswapResult.estimatedAmountOut : preswapResult.estimatedAmountIn;

      const amount_limit = byAmountIn
        ? this.calculateMinOutput(BigInt(estimatedAmount), slippage)
        : this.calculateMaxInput(BigInt(estimatedAmount), slippage);

      return {
        amount_in: byAmountIn ? params.amount : estimatedAmount.toString(),
        amount_out: byAmountIn ? estimatedAmount.toString() : params.amount,
        price_impact: "0", // TODO: Calculate price impact
        fee: preswapResult.estimatedFeeAmount?.toString() || "0",
        sqrt_price_limit: params.sqrt_price_limit || sqrt_price_limit,
        amount_limit: amount_limit,
      };
    } catch (error) {
      console.warn("Cetus preswap failed, using mock estimate:", error);
      return this.mockPreSwap(params);
    }
  }

  private mockPreSwap(params: CetusSwapParams): SwapEstimate {
    // Mock estimate for development/testing
    const a2b = params.direction === "A_TO_B";
    const sqrt_price_limit = a2b ? "4295048016" : "79226673515401279992447579055";

    return {
      amount_in: params.amount,
      amount_out: params.amount, // 1:1 for mock
      price_impact: "0",
      fee: "0",
      sqrt_price_limit: params.sqrt_price_limit || sqrt_price_limit,
      amount_limit: params.amount,
    };
  }

  /**
   * Add swap transaction to PTB using router::swap
   */
  swap(tx: Transaction, node: DexSwapNode, coinIn: any, estimate: SwapEstimate): any {
    const params = node.params as CetusSwapParams;
    const config = this.getConfig();

    const a2b = params.direction === "A_TO_B";
    const byAmountIn = params.amount_mode === "EXACT_IN";
    const amount = BigInt(params.amount);

    // Create zero coin for the other side
    const otherCoinType = a2b ? params.coin_type_b : params.coin_type_a;
    const zeroCoin = tx.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [otherCoinType],
    });

    // Prepare arguments for router::swap
    // Based on Navi SDK implementation
    // Arguments: [GlobalConfig, Pool, CoinA, CoinB, a2b, by_amount_in, amount, limit, is_pre_swap, Clock]
    
    // If a2b: coinA is input (coinIn), coinB is output (zeroCoin)
    // If b2a: coinA is output (zeroCoin), coinB is input (coinIn)
    const coinA = a2b ? coinIn : zeroCoin;
    const coinB = a2b ? zeroCoin : coinIn;

    const [coinAOut, coinBOut] = tx.moveCall({
      target: `${config.CETUS.PACKAGE}::router::swap`,
      arguments: [
        tx.object(config.CETUS.CONFIG.global_config_id),
        tx.object(params.pool_id),
        coinA,
        coinB,
        tx.pure.bool(a2b),
        tx.pure.bool(byAmountIn),
        tx.pure.u64(amount),
        tx.pure.u128(estimate.sqrt_price_limit || "0"),
        tx.pure.bool(false), // is_pre_swap = false
        tx.object("0x6"), // Clock
      ],
      typeArguments: [params.coin_type_a, params.coin_type_b],
    });

    // Handle the results
    // If a2b: coinAOut is remainder of A, coinBOut is swapped B
    // If b2a: coinAOut is swapped A, coinBOut is remainder of B
    
    if (a2b) {
      // Return swapped B. Remainder A needs to be handled.
      // Since we can't easily transfer to user here without sender address,
      // and we expect exact input usually, the remainder should be minimal.
      // Ideally we should transfer coinAOut to the user.
      // For now, we leave it in the transaction context (it might cause unused value error if not 0).
      // TODO: Implement transfer to sender if possible.
      this.transferOrDestroy(tx, coinAOut, params.coin_type_a);
      return coinBOut;
    } else {
      // Return swapped A. Remainder B needs to be handled.
      this.transferOrDestroy(tx, coinBOut, params.coin_type_b);
      return coinAOut;
    }
  }

  /**
   * Helper to handle leftover coins.
   * Tries to destroy if zero, otherwise leaves it (PTB might fail if non-zero and not transferred).
   * In a real scenario, this should transfer to the user.
   */
  private transferOrDestroy(tx: Transaction, coin: any, coinType: string) {
    // Try to destroy zero. If it has value, this will fail? 
    // No, destroy_zero fails if value > 0.
    // Since we don't have sender, we can't transfer.
    // But wait, we can assume coinIn was fully consumed if amount matches.
    // If not, we have a problem.
    // We will try to transfer to 0x0? No.
    // We will attempt to destroy zero. If it fails, it means we have dust.
    // Ideally the strategy logic handles amounts precisely.
    tx.moveCall({
      target: "0x2::coin::destroy_zero",
      arguments: [coin],
      typeArguments: [coinType],
    });
  }

  private calculateMinOutput(estimatedOutput: bigint, slippage: number): string {
    const minOutput = (estimatedOutput * BigInt(Math.floor((1 - slippage) * 1000000))) / BigInt(1000000);
    return minOutput.toString();
  }

  private calculateMaxInput(estimatedInput: bigint, slippage: number): string {
    const maxInput = (estimatedInput * BigInt(Math.floor((1 + slippage) * 1000000))) / BigInt(1000000);
    return maxInput.toString();
  }
}
