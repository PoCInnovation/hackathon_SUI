/**
 * Zod schemas for runtime validation of strategy JSON
 *
 * These schemas ensure that JSON from the UI is valid before PTB construction.
 */

import { z } from "zod";

// ============================================================================
// BASIC SCHEMAS
// ============================================================================

const SuiAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{1,64}$/, "Invalid Sui address format");
const CoinTypeSchema = z.string().regex(/^0x[a-fA-F0-9]+::\w+::\w+$/, "Invalid coin type format");
const U64StringSchema = z.string().regex(/^\d+$/, "Must be a numeric string");
const U64OrAllStringSchema = z.union([
  z.string().regex(/^\d+$/, "Must be a numeric string"),
  z.literal("ALL")
]);
const UUIDSchema = z.string().uuid();

// ============================================================================
// ENUMS
// ============================================================================

const NodeTypeSchema = z.enum([
  "FLASH_BORROW",
  "FLASH_REPAY",
  "DEX_SWAP",
  "COIN_SPLIT",
  "COIN_MERGE",
]);

const ProtocolSchema = z.enum([
  "NAVI",
  "DEEPBOOK_V3",
  "BUCKET",
  "SCALLOP",
  "CETUS",
  "TURBOS",
  "AFTERMATH_ROUTER",
  "NATIVE",
]);

const EdgeTypeSchema = z.enum(["COIN", "RECEIPT"]);
const OutputTypeSchema = z.enum(["COIN", "RECEIPT"]);
const SwapDirectionSchema = z.enum(["A_TO_B", "B_TO_A", "BASE_TO_QUOTE", "QUOTE_TO_BASE"]);
const AmountModeSchema = z.enum(["EXACT_IN", "EXACT_OUT"]);
const AssetTypeSchema = z.enum(["BASE", "QUOTE"]);
const ValidationSeveritySchema = z.enum(["ERROR", "WARNING", "INFO"]);

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const StrategyMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  author: SuiAddressSchema,
  description: z.string().max(500),
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
  tags: z.array(z.string()),
  price_sui: z.number().nonnegative().optional(),
  encrypted: z.boolean().optional(),
  walrus_blob_id: z.string().optional(),
  seal_policy_id: z.string().optional(),
});

// ============================================================================
// NODE OUTPUT SCHEMA
// ============================================================================

export const NodeOutputSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  output_type: OutputTypeSchema,
});

// ============================================================================
// NODE SCHEMAS
// ============================================================================

// Base node properties
const BaseNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

// Flash Borrow Node
export const FlashBorrowParamsSchema = z.object({
  asset: CoinTypeSchema,
  amount: U64StringSchema,
  pool_id: z.string().optional(),
  asset_type: AssetTypeSchema.optional(),
});

export const FlashBorrowNodeSchema = BaseNodeSchema.extend({
  type: z.literal("FLASH_BORROW"),
  protocol: z.enum(["NAVI", "DEEPBOOK_V3", "BUCKET", "SCALLOP"]),
  params: FlashBorrowParamsSchema,
  outputs: z.tuple([NodeOutputSchema, NodeOutputSchema]),
});

// Flash Repay Node
export const FlashRepayParamsSchema = z.object({
  asset: CoinTypeSchema,
  pool_id: z.string().optional(),
  asset_type: AssetTypeSchema.optional(),
});

export const FlashRepayInputsSchema = z.object({
  coin_repay: z.string().min(1),
  receipt: z.string().min(1),
});

export const FlashRepayNodeSchema = BaseNodeSchema.extend({
  type: z.literal("FLASH_REPAY"),
  protocol: z.enum(["NAVI", "DEEPBOOK_V3", "BUCKET", "SCALLOP"]),
  params: FlashRepayParamsSchema,
  inputs: FlashRepayInputsSchema,
});

// DEX Swap Nodes
export const CetusSwapParamsSchema = z.object({
  pool_id: z.string().min(1),
  coin_type_a: CoinTypeSchema,
  coin_type_b: CoinTypeSchema,
  direction: z.enum(["A_TO_B", "B_TO_A"]),
  amount_mode: AmountModeSchema,
  amount: U64OrAllStringSchema,
  slippage_tolerance: z.string().regex(/^0\.\d+$/, "Slippage must be decimal (e.g., 0.05)"),
  sqrt_price_limit: U64StringSchema.optional(),
});

export const DeepBookSwapParamsSchema = z.object({
  pool_key: z.string().min(1),
  direction: z.enum(["BASE_TO_QUOTE", "QUOTE_TO_BASE"]),
  amount: U64OrAllStringSchema,
  slippage_tolerance: z.string().regex(/^0\.\d+$/).optional(),
});

export const TurbosSwapParamsSchema = z.object({
  pool_id: z.string().min(1),
  coin_type_a: CoinTypeSchema,
  coin_type_b: CoinTypeSchema,
  direction: z.enum(["A_TO_B", "B_TO_A"]),
  amount: U64OrAllStringSchema,
  slippage_tolerance: z.string().regex(/^0\.\d+$/),
});

export const AftermathSwapParamsSchema = z.object({
  coin_type_in: CoinTypeSchema,
  coin_type_out: CoinTypeSchema,
  amount_in: U64OrAllStringSchema,
  slippage_tolerance: z.string().regex(/^0\.\d+$/),
  referrer: SuiAddressSchema.optional(),
  platform_fee: z.string().regex(/^0\.\d+$/).optional(),
});

export const DexSwapInputsSchema = z.object({
  coin_in: z.string().min(1),
});

export const DexSwapNodeSchema = BaseNodeSchema.extend({
  type: z.literal("DEX_SWAP"),
  protocol: z.enum(["CETUS", "DEEPBOOK_V3", "TURBOS", "AFTERMATH_ROUTER"]),
  params: z.union([
    CetusSwapParamsSchema,
    DeepBookSwapParamsSchema,
    TurbosSwapParamsSchema,
    AftermathSwapParamsSchema,
  ]),
  inputs: DexSwapInputsSchema,
  outputs: z.tuple([NodeOutputSchema]),
});

// Coin Split Node
export const CoinSplitParamsSchema = z.object({
  amounts: z.array(U64StringSchema).min(1),
});

export const CoinSplitInputsSchema = z.object({
  coin: z.string().min(1),
});

export const CoinSplitNodeSchema = BaseNodeSchema.extend({
  type: z.literal("COIN_SPLIT"),
  protocol: z.literal("NATIVE"),
  params: CoinSplitParamsSchema,
  inputs: CoinSplitInputsSchema,
  outputs: z.array(NodeOutputSchema).min(1),
});

// Coin Merge Node
export const CoinMergeInputsSchema = z.object({
  target_coin: z.string().min(1),
  merge_coins: z.array(z.string().min(1)).min(1),
});

export const CoinMergeNodeSchema = BaseNodeSchema.extend({
  type: z.literal("COIN_MERGE"),
  protocol: z.literal("NATIVE"),
  params: z.object({}),
  inputs: CoinMergeInputsSchema,
  outputs: z.tuple([NodeOutputSchema]),
});

// Custom Node
export const CustomArgumentSchema = z.object({
  type: z.enum(["pure", "object", "shared_object", "input", "make_vec"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  input_ref: z.string().optional(),
  object_id: z.string().optional(),
  value_type: z.string().optional(),
  mutable: z.boolean().optional(),
});

export const CustomNodeParamsSchema = z.object({
  target: z.string().regex(/^0x[a-fA-F0-9]+::\w+::\w+$/, "Target must be format: 0xPackage::module::function"),
  arguments: z.array(CustomArgumentSchema),
  type_arguments: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const CustomNodeSchema = BaseNodeSchema.extend({
  type: z.literal("CUSTOM"),
  protocol: z.literal("CUSTOM"),
  params: CustomNodeParamsSchema,
  inputs: z.record(z.union([z.string(), z.array(z.string())])),
  outputs: z.array(NodeOutputSchema),
});

// Union of all node types
export const NodeSchema = z.discriminatedUnion("type", [
  FlashBorrowNodeSchema,
  FlashRepayNodeSchema,
  DexSwapNodeSchema,
  CoinSplitNodeSchema,
  CoinMergeNodeSchema,
  CustomNodeSchema,
]);

// ============================================================================
// EDGE SCHEMA
// ============================================================================

export const EdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  source_output: z.string().min(1),
  target: z.string().min(1),
  target_input: z.string().min(1),
  edge_type: EdgeTypeSchema,
  coin_type: CoinTypeSchema.optional(),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ValidationRuleSchema = z.object({
  rule_id: z.string().min(1),
  severity: ValidationSeveritySchema,
  message: z.string().min(1),
  node_id: z.string().optional(),
  edge_id: z.string().optional(),
});

export const ValidationResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(ValidationRuleSchema),
  warnings: z.array(ValidationRuleSchema),
  info: z.array(ValidationRuleSchema),
});

// ============================================================================
// STRATEGY SCHEMA (ROOT)
// ============================================================================

export const StrategySchema = z.object({
  id: UUIDSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver format (e.g., 1.0.0)"),
  meta: StrategyMetadataSchema,
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema),
  validation: ValidationResultSchema.optional(),
});

// ============================================================================
// TYPE EXPORTS (inferred from Zod schemas)
// ============================================================================

export type StrategySchemaType = z.infer<typeof StrategySchema>;
export type NodeSchemaType = z.infer<typeof NodeSchema>;
export type EdgeSchemaType = z.infer<typeof EdgeSchema>;
export type ValidationResultSchemaType = z.infer<typeof ValidationResultSchema>;
