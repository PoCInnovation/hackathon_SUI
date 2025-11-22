/**
 * Simulator
 *
 * Orchestrates the dry run of a strategy against the Sui network.
 * Validates the strategy, builds the transaction, and executes a dry run
 * to estimate gas costs and profit/loss.
 */

import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { TransactionBuilder } from "./transaction-builder";
import {
  Strategy,
  SimulationResult,
  ValidationRule,
  SwapEstimate,
} from "../types/strategy";

export class Simulator {
  private builder: TransactionBuilder;
  private client: SuiClient;

  constructor(private readonly network: "mainnet" | "testnet" = "mainnet") {
    this.builder = new TransactionBuilder();
    this.client = new SuiClient({ url: this.getFullNodeUrl() });
  }

  /**
   * Simulate a strategy by running a dry run on the network.
   *
   * @param strategy - The strategy to simulate
   * @param sender - The sender address to use for the simulation
   * @returns SimulationResult containing success status, gas estimate, and profit/loss
   */
  async simulate(strategy: Strategy, sender: string): Promise<SimulationResult> {
    // Reset builder state
    this.builder.reset();

    const result: SimulationResult = {
      success: false,
      estimated_gas: 0,
      estimated_profit_loss: [],
      swap_estimates: new Map<string, SwapEstimate>(),
      errors: [],
      warnings: [],
    };

    try {
      // 1. Build the transaction
      // This also performs validation and pre-simulation (swap estimates)
      const tx = await this.builder.buildFromStrategy(strategy);
      tx.setSender(sender);

      // Capture swap estimates from builder if available
      // Note: TransactionBuilder doesn't expose cache publicly yet.
      // We might want to add a getter to TransactionBuilder for this,
      // or just accept that we don't have them in the simulation result for now unless we modify Builder.
      // For now, let's proceed without explicit swap estimates in the output 
      // (or we could assume the builder attached them to the node objects if we modified it, but we didn't).

      // 2. Execute Dry Run
      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: this.client }),
      });

      // 3. Parse Results
      if (dryRunResult.effects.status.status === "success") {
        result.success = true;
        
        // Calculate Gas Used
        const gasUsed =
          BigInt(dryRunResult.effects.gasUsed.computationCost) +
          BigInt(dryRunResult.effects.gasUsed.storageCost) -
          BigInt(dryRunResult.effects.gasUsed.storageRebate);
        
        result.estimated_gas = Number(gasUsed);

        // Calculate Profit/Loss from Balance Changes
        // We only care about changes for the sender
        const balanceMap = new Map<string, bigint>();

        if (dryRunResult.balanceChanges) {
          for (const change of dryRunResult.balanceChanges) {
            // Check if the owner is the sender
            // Owner can be { AddressOwner: string } or { ObjectOwner: string } or { Shared: ... }
            // We need to check if it matches our sender
            if (
              change.owner && 
              typeof change.owner === 'object' && 
              'AddressOwner' in change.owner && 
              change.owner.AddressOwner === sender
            ) {
              const current = balanceMap.get(change.coinType) || 0n;
              balanceMap.set(change.coinType, current + BigInt(change.amount));
            }
          }
        }

        // Convert map to result array
        balanceMap.forEach((amount, coinType) => {
          result.estimated_profit_loss.push({
            coin_type: coinType,
            amount: amount.toString(),
          });
        });

      } else {
        // Transaction failed
        result.success = false;
        result.errors.push({
          rule_id: "dry_run_failed",
          severity: "ERROR",
          message: `Dry run failed: ${dryRunResult.effects.status.error || "Unknown error"}`,
        });
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push({
        rule_id: "simulation_error",
        severity: "ERROR",
        message: error.message || "An unexpected error occurred during simulation",
      });
    }

    return result;
  }

  private getFullNodeUrl(): string {
    return this.network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443";
  }
}

