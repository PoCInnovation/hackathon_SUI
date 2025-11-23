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
      // Set a high gas budget for simulation to avoid "could not determine budget" errors
      // The dry run will show actual gas needed regardless of this value
      tx.setGasBudget(1000000000); // 1 SUI max gas budget for simulation

      const txBytes = await tx.build({ client: this.client });

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: txBytes,
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
        const errorMsg = dryRunResult.effects.status.error || "Unknown error";
        console.error("Dry run failed with error:", errorMsg);
        // For debugging, return raw error
        result.errors.push({
          rule_id: "dry_run_failed",
          severity: "ERROR",
          message: errorMsg,
        });
      }

    } catch (error: any) {
      result.success = false;
      console.error("Simulation error details:", error);
      const userMessage = this.parseExecutionError(error.message || "An unexpected error occurred during simulation");
      result.errors.push({
        rule_id: "simulation_error",
        severity: "ERROR",
        message: userMessage,
      });
    }

    return result;
  }

  /**
   * Parse Move execution errors and return user-friendly messages
   */
  private parseExecutionError(errorMsg: string): string {
    // Handle "could not automatically determine a budget" errors with MoveAbort
    if (errorMsg.includes("could not automatically determine a budget") && errorMsg.includes("MoveAbort")) {
      // Extract abort code
      const abortCodeMatch = errorMsg.match(/MoveAbort.*?(\d+)\)/);
      const abortCode = abortCodeMatch ? parseInt(abortCodeMatch[1]) : null;

      if (abortCode === 1503) {
        return "Insufficient balance: You don't have enough SUI on mainnet to cover the transaction. Make sure you have sufficient balance to cover the borrowed amount + gas fees.";
      }
      if (abortCode === 1502) {
        return "Flash loan repayment error: The repayment amount is incorrect. The borrowed amount plus fees must be repaid exactly.";
      }
      if (abortCode === 1) {
        return "Assertion failed in flash loan contract. Check your strategy logic.";
      }

      return `Budget error: The protocol cannot determine the required budget (error code: ${abortCode || "unknown"}). You probably don't have enough SUI on mainnet.`;
    }

    // Handle Move abort errors (e.g., "MoveAbort(MoveLocation { ... }, 1503)")
    if (errorMsg.includes("MoveAbort")) {
      // Extract abort code if available
      const abortCodeMatch = errorMsg.match(/MoveAbort.*?(\d+)\)/);
      const abortCode = abortCodeMatch ? parseInt(abortCodeMatch[1]) : null;

      // Map common abort codes to user-friendly messages
      if (abortCode === 1503) {
        return "Insufficient balance: You don't have enough SUI on mainnet to cover the transaction. Make sure you have sufficient balance to cover the borrowed amount + gas fees.";
      }
      if (abortCode === 1502) {
        return "Flash loan repayment error: The repayment amount is incorrect. The borrowed amount plus fees must be repaid exactly.";
      }
      if (abortCode === 1) {
        return "Assertion failed in flash loan contract. Check your strategy logic.";
      }

      // Generic message for other abort codes
      return `Execution error (Error code: ${abortCode || "unknown"}). You may not have enough funds or there may be an issue with your strategy logic on mainnet.`;
    }

    // Handle other error patterns
    if (errorMsg.includes("could not automatically determine a budget")) {
      return "Unable to determine gas budget: You may not have enough SUI on mainnet for gas fees. Make sure you have sufficient balance.";
    }

    if (errorMsg.includes("balance")) {
      return "Insufficient balance on mainnet: You don't have enough SUI to execute this strategy. Please add more funds to your wallet.";
    }

    if (errorMsg.includes("gas")) {
      return "Insufficient gas on mainnet: You don't have enough SUI to pay for gas fees. Please add more funds to your wallet.";
    }

    if (errorMsg.includes("coin")) {
      return "Coin error on mainnet: There may be an issue with the coins in your strategy. Check that all coin types are correct.";
    }

    // Return original error with a generic note
    return `Execution error on mainnet: ${errorMsg}. Make sure you have sufficient SUI balance and check your strategy.`;
  }

  private getFullNodeUrl(): string {
    return this.network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443";
  }
}

