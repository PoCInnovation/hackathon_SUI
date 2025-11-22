/**
 * Navi Protocol Flash Loan Adapter
 *
 * Integrates with Navi Protocol's flash loan functionality.
 * Fee: 0.06%
 */

import { Transaction } from "@mysten/sui/transactions";
import { FlashBorrowNode, FlashRepayNode } from "../../types/strategy";
import { BaseFlashLoanAdapter, BorrowResult } from "./types";
import { MAINNET_ADDRESSES } from "../../config/addresses";

export class NaviAdapter extends BaseFlashLoanAdapter {
  readonly protocol = "NAVI";
  protected readonly feePercentage = 0.0006; // 0.06%

  private getConfig() {
    return MAINNET_ADDRESSES;
  }

  borrow(tx: Transaction, node: FlashBorrowNode): BorrowResult {
    const config = this.getConfig();
    // Get pool config for the asset
    const poolConfig = this.getPoolConfig(node.params.asset);

    const amount = BigInt(node.params.amount);

    // Construct the PTB call for flash loan
    // Based on Navi SDK implementation: flash_loan_with_ctx_v2
    const [balance, receipt] = tx.moveCall({
      target: `${config.NAVI.PACKAGE}::lending::flash_loan_with_ctx_v2`,
      arguments: [
        tx.object(config.NAVI.FLASHLOAN_CONFIG),
        tx.object(poolConfig.poolId),
        tx.pure.u64(amount),
        tx.object("0x05"), // System object required by Navi
      ],
      typeArguments: [node.params.asset],
    });

    // Convert Balance to Coin so it can be used in the strategy graph
    const coin = tx.moveCall({
      target: "0x2::coin::from_balance",
      arguments: [balance],
      typeArguments: [node.params.asset],
    });

    return { coin, receipt };
  }

  repay(tx: Transaction, node: FlashRepayNode, coin: any, receipt: any): void {
    const config = this.getConfig();
    const poolConfig = this.getPoolConfig(node.params.asset);

    // Convert Coin back to Balance for repayment
    // Navi flash_repay expects Balance, mirroring the flash_loan output
    const balance = tx.moveCall({
      target: "0x2::coin::into_balance",
      arguments: [coin],
      typeArguments: [node.params.asset],
    });

    // Repay the flash loan
    // Based on Navi SDK implementation: flash_repay_with_ctx
    // IMPORTANT: This function returns Balance<CoinType> representing the remaining balance after repayment
    const remainingBalance = tx.moveCall({
      target: `${config.NAVI.PACKAGE}::lending::flash_repay_with_ctx`,
      arguments: [
        tx.object("0x06"), // Clock
        tx.object(config.NAVI.STORAGE),
        tx.object(poolConfig.poolId),
        receipt,
        balance,
      ],
      typeArguments: [node.params.asset],
    });

    // Convert remaining balance back to Coin
    // This handles any leftover funds after paying the flash loan fee
    const remainingCoin = tx.moveCall({
      target: "0x2::coin::from_balance",
      arguments: [remainingBalance],
      typeArguments: [node.params.asset],
    });

    // Merge the remaining coin back into the gas coin to avoid UnusedValueWithoutDrop error
    // This returns any leftover funds to the sender
    tx.mergeCoins(tx.gas, [remainingCoin]);
  }

  /**
   * Get pool configuration for a given asset
   */
  private getPoolConfig(asset: string): { poolId: string; assetId: number; name: string } {
    const config = this.getConfig();
    const pool = config.NAVI.POOLS[asset as keyof typeof config.NAVI.POOLS];

    if (!pool) {
      throw new Error(`No Navi pool found for asset: ${asset}. Please add it to backend/src/config/addresses.ts`);
    }

    return pool;
  }
}
