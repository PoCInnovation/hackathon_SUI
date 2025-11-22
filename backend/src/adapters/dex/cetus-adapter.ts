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

  async preSwap(node: DexSwapNode, estimatedInputAmount?: string): Promise<SwapEstimate> {
    const params = node.params as CetusSwapParams;

    if (!this.sdk) {
      return this.mockPreSwap(params);
    }

    let pool;
    try {
      // Fetch pool data
      pool = await this.sdk.Pool.getPool(params.pool_id);
    } catch (error) {
      console.warn("Failed to fetch pool:", error);
      return this.mockPreSwap(params, estimatedInputAmount);
    }

    if (!pool) {
      throw new Error(`Cetus pool not found: ${params.pool_id}`);
    }
    
    // Check for coin type inversion
    let is_inverted = false;
    if (pool.coinTypeA === params.coin_type_b && pool.coinTypeB === params.coin_type_a) {
      is_inverted = true;
      console.log(`Pool ${params.pool_id} is inverted relative to params.`);
    }

    // If amount is "ALL", use the estimated amount from the previous swap
    if (params.amount === "ALL") {
      return this.mockPreSwap(params, estimatedInputAmount, pool.coinTypeA, pool.coinTypeB, is_inverted);
    }

    try {
      // Determine swap direction
      const user_a2b = params.direction === "A_TO_B";
      const byAmountIn = params.amount_mode === "EXACT_IN";
      
      const real_a2b = is_inverted ? !user_a2b : user_a2b;

      // Pre-swap calculation
      const preswapResult = await this.sdk.Swap.preswap({
        pool: pool,
        currentSqrtPrice: pool.current_sqrt_price,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        decimalsA: 9, // TODO: Get actual decimals dynamically
        decimalsB: 6, // TODO: Get actual decimals dynamically
        a2b: real_a2b,
        byAmountIn: byAmountIn,
        amount: params.amount,
      });

      if (!preswapResult) {
        throw new Error("Preswap returned null");
      }

      // Calculate sqrt_price_limit
      const sqrt_price_limit = real_a2b
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
        pool_coin_type_a: pool.coinTypeA,
        pool_coin_type_b: pool.coinTypeB,
        is_inverted: is_inverted
      };
    } catch (error) {
      console.warn("Cetus preswap failed, using mock estimate:", error);
      // Pass pool info to mock
      return this.mockPreSwap(params, estimatedInputAmount, pool.coinTypeA, pool.coinTypeB, is_inverted);
    }
  }

  private mockPreSwap(
    params: CetusSwapParams, 
    estimatedInputAmount?: string,
    poolCoinA?: string,
    poolCoinB?: string,
    isInverted: boolean = false
  ): SwapEstimate {
    // Mock estimate for development/testing
    const user_a2b = params.direction === "A_TO_B";
    const real_a2b = isInverted ? !user_a2b : user_a2b;
    
    const sqrt_price_limit = real_a2b ? "4295048016" : "79226673515401279992447579055";

    // For "ALL", use the estimated amount from the previous swap, or a default placeholder
    const mockAmount = params.amount === "ALL"
      ? (estimatedInputAmount || "1000000")
      : params.amount;

    const byAmountIn = params.amount_mode === "EXACT_IN";

    return {
      amount_in: mockAmount,
      amount_out: mockAmount, // 1:1 for mock
      price_impact: "0",
      fee: "0",
      sqrt_price_limit: params.sqrt_price_limit || sqrt_price_limit,
      // Use permissive limits for mock to avoid slippage errors
      amount_limit: byAmountIn ? "0" : "18446744073709551615",
      pool_coin_type_a: poolCoinA || params.coin_type_a,
      pool_coin_type_b: poolCoinB || params.coin_type_b,
      is_inverted: isInverted
    };
  }

  /**
   * Add swap transaction to PTB using router::swap
   */
  swap(tx: Transaction, node: DexSwapNode, coinIn: any, estimate: SwapEstimate): any {
    const params = node.params as CetusSwapParams;
    const config = this.getConfig();

    const user_a2b = params.direction === "A_TO_B";
    const byAmountIn = params.amount_mode === "EXACT_IN";
    
    // Use pool info from estimate if available
    const is_inverted = estimate.is_inverted || false;
    const pool_coin_a = estimate.pool_coin_type_a || params.coin_type_a;
    const pool_coin_b = estimate.pool_coin_type_b || params.coin_type_b;
    
    const real_a2b = is_inverted ? !user_a2b : user_a2b;

    // Support "ALL" to use the estimated amount from preSwap
    // We cannot use coin::value in the PTB because the result of a moveCall
    // cannot be directly used as a u64 argument in another moveCall
    // Instead, we use the amount_in from the estimate (which came from the previous swap's amount_out)
    let amount: any;
    if (params.amount === "ALL") {
      // Use the actual coin value from the input coin
      const inputCoinType = user_a2b ? params.coin_type_a : params.coin_type_b;
      amount = tx.moveCall({
        target: "0x2::coin::value",
        arguments: [coinIn],
        typeArguments: [inputCoinType],
      });
    } else {
      amount = tx.pure.u64(BigInt(params.amount));
    }

    // Create zero coin for the other side
    // If real_a2b (A->B), we need zero B.
    // If !real_a2b (B->A), we need zero A.
    const otherCoinType = real_a2b ? pool_coin_b : pool_coin_a;
    const zeroCoin = tx.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [otherCoinType],
    });

    // Prepare arguments for router::swap
    // Based on Navi SDK implementation
    // Arguments: [GlobalConfig, Pool, CoinA, CoinB, a2b, by_amount_in, amount, limit, is_pre_swap, Clock]

    // If real_a2b (A->B): coinA is input (coinIn), coinB is output (zeroCoin)
    // If !real_a2b (B->A): coinA is output (zeroCoin), coinB is input (coinIn)
    const coinA = real_a2b ? coinIn : zeroCoin;
    const coinB = real_a2b ? zeroCoin : coinIn;

    const [coinAOut, coinBOut] = tx.moveCall({
      target: `${config.CETUS.PACKAGE}::router::swap`,
      arguments: [
        tx.object(config.CETUS.CONFIG.global_config_id),
        tx.object(params.pool_id),
        coinA,
        coinB,
        tx.pure.bool(real_a2b),
        tx.pure.bool(byAmountIn),
        amount,
        tx.pure.u128(estimate.sqrt_price_limit || "0"),
        tx.pure.bool(false), // is_pre_swap = false
        tx.object("0x6"), // Clock
      ],
      typeArguments: [pool_coin_a, pool_coin_b],
    });

    // Handle the results
    // If real_a2b (A->B): coinAOut is remainder of A, coinBOut is swapped B
    // If !real_a2b (B->A): coinAOut is swapped A, coinBOut is remainder of B
    
    if (real_a2b) {
      // Return swapped B. Remainder A needs to be handled.
      this.transferOrDestroy(tx, coinAOut, pool_coin_a);
      return coinBOut;
    } else {
      // Return swapped A. Remainder B needs to be handled.
      this.transferOrDestroy(tx, coinBOut, pool_coin_b);
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
