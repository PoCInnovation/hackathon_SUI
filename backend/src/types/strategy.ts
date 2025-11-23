/**
 * Core TypeScript interfaces for Sail Flash Loan Strategy Builder
 *
 * These interfaces define the JSON schema that represents a flash loan strategy.
 * The UI team will generate this JSON, and the PTB builder will consume it.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type NodeType =
  | "FLASH_BORROW"
  | "FLASH_REPAY"
  | "DEX_SWAP"
  | "COIN_SPLIT"
  | "COIN_MERGE"
  | "CUSTOM";

export type Protocol =
  | "NAVI"
  | "DEEPBOOK_V3"
  | "BUCKET"
  | "SCALLOP"
  | "CETUS"
  | "TURBOS"
  | "AFTERMATH_ROUTER"
  | "NATIVE"   // For built-in Sui operations (split, merge)
  | "CUSTOM";  // For user-defined custom Move calls

export type EdgeType = "COIN" | "RECEIPT";

export type OutputType = "COIN" | "RECEIPT";

export type SwapDirection = "A_TO_B" | "B_TO_A" | "BASE_TO_QUOTE" | "QUOTE_TO_BASE";

export type AmountMode = "EXACT_IN" | "EXACT_OUT";

export type AssetType = "BASE" | "QUOTE";

// ============================================================================
// STRATEGY ROOT & METADATA
// ============================================================================

export interface Strategy {
  id: string;                    // UUID v4
  version: string;               // Schema version (e.g., "1.0.0")
  meta: StrategyMetadata;
  nodes: Node[];
  edges: Edge[];
  validation?: ValidationResult; // Optional validation state
}

export interface StrategyMetadata {
  name: string;                  // Strategy name (max 100 chars)
  author: string;                // Sui address (0x...)
  description: string;           // Strategy description (max 500 chars)
  created_at: number;            // Unix timestamp (ms)
  updated_at: number;            // Unix timestamp (ms)
  tags: string[];                // ["arbitrage", "sui-usdc", etc.]
  price_sui?: number;            // Marketplace price (optional)
  encrypted?: boolean;           // Is this strategy encrypted?
  walrus_blob_id?: string;       // Walrus storage ID
  seal_policy_id?: string;       // Seal access control policy
}

// ============================================================================
// NODE DEFINITIONS
// ============================================================================

export interface NodeOutput {
  id: string;                    // Output identifier (e.g., "coin_borrowed", "receipt")
  type: string;                  // Type annotation (e.g., "Coin<0x2::sui::SUI>", "FlashLoanReceipt")
  output_type: OutputType;       // COIN or RECEIPT
}

export interface BaseNode {
  id: string;                    // Unique within strategy (e.g., "node_1", "borrow_1")
  type: NodeType;
  protocol: Protocol;
  label?: string;                // Display name for UI
  position?: {                   // Position for React Flow
    x: number;
    y: number;
  };
}

// ----------------------------------------------------------------------------
// FLASH_BORROW Node
// ----------------------------------------------------------------------------

export interface FlashBorrowNode extends BaseNode {
  type: "FLASH_BORROW";
  protocol: "NAVI" | "DEEPBOOK_V3" | "BUCKET" | "SCALLOP";
  params: FlashBorrowParams;
  outputs: [NodeOutput, NodeOutput]; // [coin, receipt]
}

export interface FlashBorrowParams {
  asset: string;                 // Coin type: "0x2::sui::SUI"
  amount: string;                // Amount as string (u64)
  pool_id?: string;              // Required for DeepBook, optional for others
  asset_type?: AssetType;        // Required for DeepBook (BASE or QUOTE)
}

// ----------------------------------------------------------------------------
// FLASH_REPAY Node
// ----------------------------------------------------------------------------

export interface FlashRepayNode extends BaseNode {
  type: "FLASH_REPAY";
  protocol: "NAVI" | "DEEPBOOK_V3" | "BUCKET" | "SCALLOP";
  params: FlashRepayParams;
  inputs: FlashRepayInputs;
}

export interface FlashRepayParams {
  asset: string;                 // Must match borrow asset
  pool_id?: string;              // Required for DeepBook
  asset_type?: AssetType;        // Required for DeepBook
}

export interface FlashRepayInputs {
  coin_repay: string;            // Reference: "node_id.output_id"
  receipt: string;               // Reference: "borrow_node_id.receipt_output_id"
}

// ----------------------------------------------------------------------------
// DEX_SWAP Node
// ----------------------------------------------------------------------------

export interface DexSwapNode extends BaseNode {
  type: "DEX_SWAP";
  protocol: "CETUS" | "DEEPBOOK_V3" | "TURBOS" | "AFTERMATH_ROUTER";
  params: CetusSwapParams | DeepBookSwapParams | TurbosSwapParams | AftermathSwapParams;
  inputs: DexSwapInputs;
  outputs: [NodeOutput];         // [coin_out]
}

export interface DexSwapInputs {
  coin_in: string;               // Reference: "node_id.output_id"
}

export interface CetusSwapParams {
  pool_id: string;
  coin_type_a: string;           // "0x2::sui::SUI"
  coin_type_b: string;           // "0x...::usdc::USDC"
  direction: Extract<SwapDirection, "A_TO_B" | "B_TO_A">;
  amount_mode: AmountMode;       // EXACT_IN or EXACT_OUT
  amount: string;                // Amount as string
  slippage_tolerance: string;    // "0.05" for 5%
  sqrt_price_limit?: string;     // Optional, calculated if not provided
}

export interface DeepBookSwapParams {
  pool_key: string;              // Pool key object ID
  direction: Extract<SwapDirection, "BASE_TO_QUOTE" | "QUOTE_TO_BASE">;
  amount: string;
  slippage_tolerance?: string;
}

export interface TurbosSwapParams {
  pool_id: string;
  coin_type_a: string;
  coin_type_b: string;
  direction: Extract<SwapDirection, "A_TO_B" | "B_TO_A">;
  amount: string;
  slippage_tolerance: string;
}

export interface AftermathSwapParams {
  coin_type_in: string;          // "0x2::sui::SUI"
  coin_type_out: string;         // "0x...::usdc::USDC"
  amount_in: string;
  slippage_tolerance: string;    // "0.01" for 1%
  referrer?: string;             // Optional referrer address
  platform_fee?: string;         // Optional "0.001" for 0.1%
}

// ----------------------------------------------------------------------------
// COIN_SPLIT Node
// ----------------------------------------------------------------------------

export interface CoinSplitNode extends BaseNode {
  type: "COIN_SPLIT";
  protocol: "NATIVE";
  params: CoinSplitParams;
  inputs: CoinSplitInputs;
  outputs: NodeOutput[];         // Multiple coin outputs
}

export interface CoinSplitParams {
  amounts: string[];             // Array of amounts to split ["1000", "2000"]
}

export interface CoinSplitInputs {
  coin: string;                  // Reference to coin to split
}

// ----------------------------------------------------------------------------
// COIN_MERGE Node
// ----------------------------------------------------------------------------

export interface CoinMergeNode extends BaseNode {
  type: "COIN_MERGE";
  protocol: "NATIVE";
  params: Record<string, never>; // Empty object
  inputs: CoinMergeInputs;
  outputs: [NodeOutput];         // Single merged coin
}

export interface CoinMergeInputs {
  target_coin: string;           // Coin to merge into
  merge_coins: string[];         // Array of coins to merge (same type)
}

// ----------------------------------------------------------------------------
// CUSTOM Node (User-Defined Move Calls)
// ----------------------------------------------------------------------------

export interface CustomNode extends BaseNode {
  type: "CUSTOM";
  protocol: "CUSTOM";
  params: CustomNodeParams;
  inputs: Record<string, string | string[]>; // Flexible inputs
  outputs: NodeOutput[];                      // Flexible outputs
}

export interface CustomNodeParams {
  target: string;                // Move function: "0xPackage::module::function"
  arguments: CustomArgument[];   // Array of arguments for the function
  type_arguments?: string[];     // Type parameters (e.g., ["0x2::sui::SUI"])
  description?: string;          // User description for marketplace
}

export interface CustomArgument {
  type: "pure" | "object" | "shared_object" | "input" | "make_vec";  // Argument type
  value?: string | number | boolean;  // For "pure" type and "shared_object" (object ID)
  input_ref?: string;                 // For "input" and "make_vec" types (reference to another node)
  object_id?: string;                 // For "object" type (on-chain object)
  value_type?: string;                // Type annotation (e.g., "u64", "address", "0x2::coin::Coin<T>")
  mutable?: boolean;                  // For "shared_object" type
}

// ----------------------------------------------------------------------------
// Union Type for All Nodes
// ----------------------------------------------------------------------------

export type Node =
  | FlashBorrowNode
  | FlashRepayNode
  | DexSwapNode
  | CoinSplitNode
  | CoinMergeNode
  | CustomNode;

// ============================================================================
// EDGE DEFINITIONS
// ============================================================================

export interface Edge {
  id: string;                    // Unique edge ID
  source: string;                // Source node ID
  source_output: string;         // Output ID from source node
  target: string;                // Target node ID
  target_input: string;          // Input ID on target node
  edge_type: EdgeType;           // COIN or RECEIPT
  coin_type?: string;            // For COIN edges: "0x2::sui::SUI"
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface ValidationRule {
  rule_id: string;               // Unique rule identifier
  severity: ValidationSeverity;
  message: string;               // Human-readable error message
  node_id?: string;              // Optional node that caused the error
  edge_id?: string;              // Optional edge that caused the error
}

export interface ValidationResult {
  success: boolean;              // Overall validation status
  errors: ValidationRule[];      // Critical errors (prevent execution)
  warnings: ValidationRule[];    // Non-critical warnings
  info: ValidationRule[];        // Informational messages
}

// ============================================================================
// SIMULATION RESULTS
// ============================================================================

export interface SwapEstimate {
  amount_in: string;             // Estimated input amount
  amount_out: string;            // Estimated output amount
  price_impact: string;          // Price impact percentage
  fee: string;                   // Protocol fee amount
}

export interface SimulationResult {
  success: boolean;
  estimated_gas: number;         // Gas cost estimate
  estimated_profit_loss: {
    amount: string;              // Net profit/loss
    coin_type: string;           // Coin type
  }[];
  swap_estimates: Map<string, SwapEstimate>; // nodeId -> estimate
  errors: ValidationRule[];
  warnings: ValidationRule[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Reference format: "nodeId.outputId"
 * Example: "borrow_1.coin_borrowed"
 */
export type NodeReference = string;

/**
 * Coin type format: "0x{package}::{module}::{type}"
 * Example: "0x2::sui::SUI"
 */
export type CoinType = string;

/**
 * Sui address format: "0x{64_hex_chars}"
 */
export type SuiAddress = string;

/**
 * U64 as string to avoid precision issues
 */
export type U64String = string;
