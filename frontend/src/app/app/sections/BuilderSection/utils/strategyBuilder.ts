import { v4 as uuidv4 } from "uuid";
import { Block } from "../components/types";

export function normalizeToken(input: string, tokenMap: Record<string, string>): string {
  if (!input) return "";
  const upperInput = input.toUpperCase();
  // Check dynamic map first
  if (tokenMap[upperInput]) return tokenMap[upperInput];
  // Fallback for SUI if not in map (though it should be)
  if (upperInput === "SUI") return "0x2::sui::SUI";
  return input;
}

export function normalizeAmount(amount: string): string {
  if (!amount) return "0";
  
  // Always treat input as SUI and convert to MIST (multiply by 10^9)
  const amountInSui = parseFloat(amount);
  if (isNaN(amountInSui)) return "0";
  
  return Math.floor(amountInSui * 1_000_000_000).toString();
}

export function buildStrategyFromBlocks(blocks: Block[], tokenMap: Record<string, string>, authorAddress: string) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Create Strategy Metadata
  const strategyId = uuidv4();
  const strategy = {
    id: strategyId,
    version: "1.0.0",
    meta: {
      name: "Flash Loan Strategy",
      author: authorAddress,
      description: "Generated via Sail Builder",
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ["ui-builder", "flashloan"]
    },
    nodes,
    edges
  };

  let lastCoinOutputId: string | null = null;
  let lastCoinType: string | null = null;
  let flashLoanReceiptId: string | null = null;
  let flashLoanReceiptNodeId: string | null = null;

  blocks.forEach((block, index) => {
    const nodeId = `node_${index}_${block.type}`;
    
    if (block.type === "flash_borrow") {
      const asset = normalizeToken(block.params.asset, tokenMap);
      const amount = normalizeAmount(block.params.amount || "0");

      nodes.push({
        id: nodeId,
        type: "FLASH_BORROW",
        protocol: "NAVI",
        params: { asset, amount },
        outputs: [
          { id: "coin_borrowed", type: `Coin<${asset}>`, output_type: "COIN" },
          { id: "receipt", type: "FlashLoanReceipt", output_type: "RECEIPT" }
        ]
      });

      lastCoinOutputId = "coin_borrowed";
      lastCoinType = asset;
      flashLoanReceiptId = "receipt";
      flashLoanReceiptNodeId = nodeId;
    } 
    else if (block.type === "swap") {
      let coinA = normalizeToken(block.params.from, tokenMap);
      let coinB = normalizeToken(block.params.to, tokenMap);
      const poolId = block.params.pool_id;
      const amount = block.params.amount === "ALL" ? "ALL" : normalizeAmount(block.params.amount);
      
      let direction = "A_TO_B";

      // Special handling for SUI/USDC to match backend script structure
      // Ensure coin_type_a is SUI and coin_type_b is USDC (or vice versa depending on pool, but keeping consistent)
      // Assuming SUI is usually A in this pool 0xcf99...
      const SUI_ADDR = "0x2::sui::SUI";
      const USDC_ADDR = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";

      if ((coinA === SUI_ADDR && coinB === USDC_ADDR) || (coinA === USDC_ADDR && coinB === SUI_ADDR)) {
        if (coinA === USDC_ADDR) {
          // User wants USDC -> SUI
          // Set A=SUI, B=USDC, Direction=B_TO_A
          coinA = SUI_ADDR;
          coinB = USDC_ADDR;
          direction = "B_TO_A";
        } else {
          // User wants SUI -> USDC
          // Set A=SUI, B=USDC, Direction=A_TO_B
          coinA = SUI_ADDR;
          coinB = USDC_ADDR;
          direction = "A_TO_B";
        }
      }

      nodes.push({
        id: nodeId,
        type: "DEX_SWAP",
        protocol: "CETUS",
        params: {
          pool_id: poolId,
          coin_type_a: coinA,
          coin_type_b: coinB,
          direction: direction,
          amount_mode: "EXACT_IN",
          amount: amount,
          slippage_tolerance: "0.01"
        },
        inputs: {
          coin_in: lastCoinOutputId ? `${nodes[nodes.length - 1].id}.${lastCoinOutputId}` : "input_coin"
        },
        outputs: [
          { id: "coin_out", type: `Coin<${direction === "A_TO_B" ? coinB : coinA}>`, output_type: "COIN" }
        ]
      });

      // Create Edge
      if (nodes.length > 1) {
        const sourceNode = nodes[nodes.length - 2];
        edges.push({
          id: `edge_${index}`,
          source: sourceNode.id,
          source_output: lastCoinOutputId!,
          target: nodeId,
          target_input: "coin_in",
          edge_type: "COIN",
          coin_type: lastCoinType!
        });
      }

      lastCoinOutputId = "coin_out";
      lastCoinType = direction === "A_TO_B" ? coinB : coinA;
    }
    else if (block.type === "flash_repay") {
      const asset = normalizeToken(block.params.asset, tokenMap);

      // 1. Split Gas (Top up)
      const splitNodeId = `split_gas_${index}`;
      nodes.push({
        id: splitNodeId,
        type: "COIN_SPLIT",
        protocol: "NATIVE",
        params: { amounts: ["10000000"] }, // 0.01 SUI top up
        inputs: { coin: "GAS" },
        outputs: [
          { id: "fee_coin", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      });

      // 2. Merge Funds
      const mergeNodeId = `merge_funds_${index}`;
      const previousNode = nodes[nodes.length - 2]; // The node before split_gas (e.g. swap)
      
      nodes.push({
        id: mergeNodeId,
        type: "COIN_MERGE",
        protocol: "NATIVE",
        params: {},
        inputs: {
          target_coin: `${previousNode.id}.${lastCoinOutputId}`,
          merge_coins: [`${splitNodeId}.fee_coin`]
        },
        outputs: [
          { id: "merged_coin", type: `Coin<${asset}>`, output_type: "COIN" }
        ]
      });

      // Edge: Previous -> Merge
      edges.push({
        id: `edge_merge_main_${index}`,
        source: previousNode.id,
        source_output: lastCoinOutputId!,
        target: mergeNodeId,
        target_input: "target_coin",
        edge_type: "COIN",
        coin_type: lastCoinType!
      });

      // Edge: Split -> Merge
      edges.push({
        id: `edge_merge_gas_${index}`,
        source: splitNodeId,
        source_output: "fee_coin",
        target: mergeNodeId,
        target_input: "merge_coins",
        edge_type: "COIN",
        coin_type: "0x2::sui::SUI"
      });

      // 3. Repay Node
      nodes.push({
        id: nodeId,
        type: "FLASH_REPAY",
        protocol: "NAVI",
        params: { asset },
        inputs: {
          coin_repay: `${mergeNodeId}.merged_coin`,
          receipt: flashLoanReceiptNodeId ? `${flashLoanReceiptNodeId}.${flashLoanReceiptId}` : "receipt"
        }
      });

      // Edge: Merge -> Repay
      edges.push({
        id: `edge_repay_coin_${index}`,
        source: mergeNodeId,
        source_output: "merged_coin",
        target: nodeId,
        target_input: "coin_repay",
        edge_type: "COIN",
        coin_type: asset
      });

      // Edge: Receipt -> Repay
      if (flashLoanReceiptNodeId && flashLoanReceiptId) {
        edges.push({
          id: `edge_repay_receipt_${index}`,
          source: flashLoanReceiptNodeId,
          source_output: flashLoanReceiptId,
          target: nodeId,
          target_input: "receipt",
          edge_type: "RECEIPT"
        });
      }
    }
  });

  return strategy;
}


