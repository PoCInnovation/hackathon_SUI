/**
 * Transaction Builder
 *
 * Core engine that compiles a strategy JSON into a Sui Programmable Transaction Block (PTB).
 *
 * Process:
 * 1. Validate strategy (schema + graph)
 * 2. Topological sort nodes
 * 3. Execute nodes in order, caching results
 * 4. Resolve references between nodes
 * 5. Return complete PTB ready for signing
 */

import { Transaction } from "@mysten/sui/transactions";
import {
  Strategy,
  Node,
  ValidationResult,
  FlashBorrowNode,
  FlashRepayNode,
  DexSwapNode,
  CoinSplitNode,
  CoinMergeNode,
  CustomNode,
} from "../types/strategy";
import { SchemaValidator } from "../validation/schema-validator";
import { GraphValidator } from "../validation/graph-validator";
import { TopologicalSort } from "../utils/topological-sort";
import { FlashLoanAdapter } from "../adapters/flashloan/types";
import { NaviAdapter } from "../adapters/flashloan/navi-adapter";
import { DexAdapter } from "../adapters/dex/types";
import { CetusAdapter } from "../adapters/dex/cetus-adapter";

/**
 * Result cache entry
 * Maps "nodeId.outputId" to PTB result
 */
type ResultCache = Map<string, any>;

/**
 * Swap estimates cache
 * Maps "nodeId" to swap estimate for DEX nodes
 */
type SwapEstimateCache = Map<string, any>;

export class TransactionBuilder {
  private tx: Transaction;
  private resultCache: ResultCache;
  private swapEstimateCache: SwapEstimateCache;

  // Protocol adapters
  private flashLoanAdapters: Map<string, FlashLoanAdapter>;
  private dexAdapters: Map<string, DexAdapter>;

  constructor() {
    this.tx = new Transaction();
    this.resultCache = new Map();
    this.swapEstimateCache = new Map();

    // Initialize adapters (Mainnet only)
    this.flashLoanAdapters = new Map([
      ["NAVI", new NaviAdapter()],
      // Add more flash loan adapters here
      // ["DEEPBOOK_V3", new DeepBookV3Adapter()],
      // ["SCALLOP", new ScallopAdapter()],
      // ["BUCKET", new BucketAdapter()],
    ]);

    this.dexAdapters = new Map([
      ["CETUS", new CetusAdapter()],
      // Add more DEX adapters here
      // ["DEEPBOOK_V3", new DeepBookV3DexAdapter()],
      // ["TURBOS", new TurbosAdapter()],
      // ["AFTERMATH_ROUTER", new AftermathAdapter()],
    ]);
  }

  /**
   * Build PTB from strategy
   *
   * @param strategy - Strategy JSON
   * @returns Transaction ready for signing
   * @throws Error if validation fails
   */
  async buildFromStrategy(strategy: Strategy): Promise<Transaction> {
    // Step 1: Validate schema
    const schemaValidation = SchemaValidator.validate(strategy);
    if (!schemaValidation.success) {
      throw new Error(
        `Schema validation failed:\n${schemaValidation.errors.map((e) => `  - ${e.message}`).join("\n")}`
      );
    }

    // Step 2: Validate graph
    const graphValidation = GraphValidator.validate(strategy);
    if (!graphValidation.success) {
      throw new Error(
        `Graph validation failed:\n${graphValidation.errors.map((e) => `  - ${e.message}`).join("\n")}`
      );
    }

    // Step 3: Pre-simulate all DEX swaps
    await this.preSimulateSwaps(strategy);

    // Step 4: Topological sort
    const sortedNodes = TopologicalSort.sort(strategy);

    // Step 5: Build PTB commands in order
    for (const node of sortedNodes) {
      await this.addNodeToTx(node, strategy);
    }

    return this.tx;
  }

  /**
   * Pre-simulate all DEX swaps to get estimates
   */
  private async preSimulateSwaps(strategy: Strategy): Promise<void> {
    const swapNodes = strategy.nodes.filter((n) => n.type === "DEX_SWAP") as DexSwapNode[];

    for (const node of swapNodes) {
      const adapter = this.dexAdapters.get(node.protocol);
      if (!adapter) {
        throw new Error(`No adapter found for DEX protocol: ${node.protocol}`);
      }

      // For swaps with "ALL", try to use the estimate from the previous swap
      let estimatedAmount: string | undefined;
      if ((node.params as any).amount === "ALL" && node.inputs?.coin_in) {
        const inputRef = node.inputs.coin_in as string;
        const [sourceNodeId] = inputRef.split(".");
        const sourceEstimate = this.swapEstimateCache.get(sourceNodeId);
        if (sourceEstimate) {
          estimatedAmount = sourceEstimate.amount_out;
        }
      }

      const estimate = await adapter.preSwap(node, estimatedAmount);
      this.swapEstimateCache.set(node.id, estimate);
    }
  }

  /**
   * Add a node to the transaction
   */
  private async addNodeToTx(node: Node, strategy: Strategy): Promise<void> {
    switch (node.type) {
      case "FLASH_BORROW":
        this.addFlashBorrow(node as FlashBorrowNode);
        break;
      case "FLASH_REPAY":
        this.addFlashRepay(node as FlashRepayNode);
        break;
      case "DEX_SWAP":
        this.addDexSwap(node as DexSwapNode);
        break;
      case "COIN_SPLIT":
        this.addCoinSplit(node as CoinSplitNode);
        break;
      case "COIN_MERGE":
        this.addCoinMerge(node as CoinMergeNode);
        break;
      case "CUSTOM":
        this.addCustomNode(node as CustomNode);
        break;
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  // ==========================================================================
  // NODE HANDLERS
  // ==========================================================================

  /**
   * Add flash borrow node
   */
  private addFlashBorrow(node: FlashBorrowNode): void {
    const adapter = this.flashLoanAdapters.get(node.protocol);
    if (!adapter) {
      throw new Error(`No adapter found for flash loan protocol: ${node.protocol}`);
    }

    const { coin, receipt } = adapter.borrow(this.tx, node);

    // Cache results
    const coinOutput = node.outputs.find((o) => o.output_type === "COIN");
    const receiptOutput = node.outputs.find((o) => o.output_type === "RECEIPT");

    if (coinOutput) {
      this.resultCache.set(`${node.id}.${coinOutput.id}`, coin);
    }
    if (receiptOutput) {
      this.resultCache.set(`${node.id}.${receiptOutput.id}`, receipt);
    }
  }

  /**
   * Add flash repay node
   */
  private addFlashRepay(node: FlashRepayNode): void {
    const adapter = this.flashLoanAdapters.get(node.protocol);
    if (!adapter) {
      throw new Error(`No adapter found for flash loan protocol: ${node.protocol}`);
    }

    // Resolve inputs
    const coin = this.resolveReference(node.inputs.coin_repay);
    const receipt = this.resolveReference(node.inputs.receipt);

    adapter.repay(this.tx, node, coin, receipt);
  }

  /**
   * Add DEX swap node
   */
  private addDexSwap(node: DexSwapNode): void {
    const adapter = this.dexAdapters.get(node.protocol);
    if (!adapter) {
      throw new Error(`No adapter found for DEX protocol: ${node.protocol}`);
    }

    // Resolve input coin
    const coinIn = this.resolveReference(node.inputs.coin_in);

    // Get pre-calculated estimate
    const estimate = this.swapEstimateCache.get(node.id);
    if (!estimate) {
      throw new Error(`No swap estimate found for node: ${node.id}`);
    }

    // Execute swap
    const coinOut = adapter.swap(this.tx, node, coinIn, estimate);

    // Cache result
    const output = node.outputs[0];
    this.resultCache.set(`${node.id}.${output.id}`, coinOut);
  }

  /**
   * Add coin split node
   */
  private addCoinSplit(node: CoinSplitNode): void {
    // Resolve input coin
    let coin;
    if (node.inputs.coin === "GAS") {
      coin = this.tx.gas;
    } else {
      coin = this.resolveReference(node.inputs.coin);
    }

    // Split coins
    const amounts = node.params.amounts.map((a) => BigInt(a));

    // tx.splitCoins returns a single coin when there's only one amount,
    // or an array when there are multiple amounts
    if (amounts.length === 1) {
      const splitCoin = this.tx.splitCoins(coin, [this.tx.pure.u64(amounts[0])]);
      this.resultCache.set(`${node.id}.${node.outputs[0].id}`, splitCoin);
    } else {
      const splitCoins = this.tx.splitCoins(coin, amounts.map((a) => this.tx.pure.u64(a)));
      node.outputs.forEach((output, index) => {
        this.resultCache.set(`${node.id}.${output.id}`, splitCoins[index]);
      });
    }
  }

  /**
   * Add coin merge node
   */
  private addCoinMerge(node: CoinMergeNode): void {
    // Resolve target coin and merge coins
    const targetCoin = this.resolveReference(node.inputs.target_coin);
    const mergeCoins = node.inputs.merge_coins.map((ref) => this.resolveReference(ref));

    // Merge coins
    this.tx.mergeCoins(targetCoin, mergeCoins);

    // Cache result (target coin now contains all merged coins)
    const output = node.outputs[0];
    this.resultCache.set(`${node.id}.${output.id}`, targetCoin);
  }

  /**
   * Add custom Move call node
   * Allows users to call any Move function directly
   */
  private addCustomNode(node: CustomNode): void {
    // Build arguments array
    const args: any[] = [];

    for (const arg of node.params.arguments) {
      switch (arg.type) {
        case "pure":
          // Pure value (number, string, boolean)
          if (arg.value_type === "u64") {
            args.push(this.tx.pure.u64(BigInt(arg.value as number)));
          } else if (arg.value_type === "u128") {
            args.push(this.tx.pure.u128(BigInt(arg.value as number)));
          } else if (arg.value_type === "bool") {
            args.push(this.tx.pure.bool(arg.value as boolean));
          } else if (arg.value_type === "address") {
            args.push(this.tx.pure.address(arg.value as string));
          } else if (arg.value_type === "string") {
            args.push(this.tx.pure.string(arg.value as string));
          } else {
            // Default: try as u64 for numbers, otherwise as is
            if (typeof arg.value === "number") {
              args.push(this.tx.pure.u64(BigInt(arg.value)));
            } else {
              args.push(this.tx.pure(arg.value as any));
            }
          }
          break;

        case "object":
          // On-chain object reference
          args.push(this.tx.object(arg.object_id!));
          break;

        case "shared_object":
          // Shared object reference (mutable or immutable)
          // For shared objects, we can pass the ID directly to tx.object()
          // The SDK handles the shared object resolution automatically
          args.push(this.tx.object(arg.value as string));
          break;

        case "input":
          // Reference to another node's output
          const resolved = this.resolveReference(arg.input_ref!);
          args.push(resolved);
          break;

        case "make_vec":
          // Create a vector containing a single coin/object
          // This is used when a function expects vector<Coin<T>> instead of Coin<T>
          const coinRef = this.resolveReference(arg.input_ref!);
          args.push(this.tx.makeMoveVec({ elements: [coinRef], type: arg.value_type! }));
          break;
      }
    }

    // Make the Move call and cache outputs
    if (node.outputs.length === 0) {
      // No outputs - just make the call
      this.tx.moveCall({
        target: node.params.target,
        arguments: args,
        typeArguments: node.params.type_arguments || [],
      });
    } else if (node.outputs.length === 1) {
      const result = this.tx.moveCall({
        target: node.params.target,
        arguments: args,
        typeArguments: node.params.type_arguments || [],
      });
      this.resultCache.set(`${node.id}.${node.outputs[0].id}`, result);
    } else {
      // Multiple outputs - use destructuring to get each return value
      // When a Move function returns (A, B), tx.moveCall() returns them as array elements that can be destructured
      const results = this.tx.moveCall({
        target: node.params.target,
        arguments: args,
        typeArguments: node.params.type_arguments || [],
      });

      // Cache each output by destructuring the result array
      node.outputs.forEach((output, index) => {
        this.resultCache.set(`${node.id}.${output.id}`, results[index]);
      });
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Resolve a node reference to a PTB result
   * Format: "nodeId.outputId"
   */
  private resolveReference(reference: string): any {
    const cached = this.resultCache.get(reference);
    if (!cached) {
      throw new Error(`Cannot resolve reference: ${reference}. Make sure it was defined in a previous node.`);
    }
    return cached;
  }

  /**
   * Validate strategy before building
   */
  static validate(strategy: Strategy): ValidationResult {
    const schemaValidation = SchemaValidator.validate(strategy);
    if (!schemaValidation.success) {
      return schemaValidation;
    }

    const graphValidation = GraphValidator.validate(strategy);
    return graphValidation;
  }

  /**
   * Get the current transaction
   */
  getTransaction(): Transaction {
    return this.tx;
  }

  /**
   * Reset the builder (clear caches and create new transaction)
   */
  reset(): void {
    this.tx = new Transaction();
    this.resultCache.clear();
    this.swapEstimateCache.clear();
  }
}
