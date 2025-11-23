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
  let lastCoinNodeId: string | null = null;
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
      lastCoinNodeId = nodeId;
      lastCoinType = asset;
      flashLoanReceiptId = "receipt";
      flashLoanReceiptNodeId = nodeId;
    } 
    else if (block.type === "swap") {
      // ... (existing swap logic) ...
      // We need to update lastCoinNodeId here too
      let coinA = normalizeToken(block.params.from, tokenMap);
      let coinB = normalizeToken(block.params.to, tokenMap);
      const poolId = block.params.pool_id;
      const amount = block.params.amount === "ALL" ? "ALL" : normalizeAmount(block.params.amount);
      
      let direction = "A_TO_B";
      const SUI_ADDR = "0x2::sui::SUI";
      const USDC_ADDR = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";

      if ((coinA === SUI_ADDR && coinB === USDC_ADDR) || (coinA === USDC_ADDR && coinB === SUI_ADDR)) {
        if (coinA === USDC_ADDR) {
          coinA = SUI_ADDR;
          coinB = USDC_ADDR;
          direction = "B_TO_A";
        } else {
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
          coin_in: lastCoinOutputId ? `${lastCoinNodeId || nodes[nodes.length - 1].id}.${lastCoinOutputId}` : "input_coin"
        },
        outputs: [
          { id: "coin_out", type: `Coin<${direction === "A_TO_B" ? coinB : coinA}>`, output_type: "COIN" }
        ]
      });

      // Create Edge
      if (nodes.length > 1) {
        const sourceNodeId = lastCoinNodeId || nodes[nodes.length - 2].id;
        edges.push({
          id: `edge_${index}`,
          source: sourceNodeId,
          source_output: lastCoinOutputId!,
          target: nodeId,
          target_input: "coin_in",
          edge_type: "COIN",
          coin_type: lastCoinType!
        });
      }

      lastCoinOutputId = "coin_out";
      lastCoinNodeId = nodeId;
      lastCoinType = direction === "A_TO_B" ? coinB : coinA;
    }
    // ... (flash_repay logic is already updated in previous step to use lastCoinNodeId) ...

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
      
      // Use the tracked lastCoinNodeId instead of naively picking the previous node
      // This handles cases where intermediate cleanup nodes were inserted
      const sourceNodeId = lastCoinNodeId || nodes[nodes.length - 2].id;
      
      nodes.push({
        id: mergeNodeId,
        type: "COIN_MERGE",
        protocol: "NATIVE",
        params: {},
        inputs: {
          target_coin: `${sourceNodeId}.${lastCoinOutputId}`,
          merge_coins: [`${splitNodeId}.fee_coin`]
        },
        outputs: [
          { id: "merged_coin", type: `Coin<${asset}>`, output_type: "COIN" }
        ]
      });

      // Edge: Previous -> Merge
      edges.push({
        id: `edge_merge_main_${index}`,
        source: sourceNodeId,
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

    else if (block.type === "custom") {
      // Helper to ensure we have objects/arrays
      const parseParam = (val: any, defaultVal: any) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return defaultVal; }
        }
        return val || defaultVal;
      };

      const customParams = {
        target: block.params.target,
        arguments: parseParam(block.params.arguments, []),
        type_arguments: parseParam(block.params.type_arguments, [])
      };
      
      const customInputs = parseParam(block.params.inputs, {});
      const customOutputs = parseParam(block.params.outputs, []);

      nodes.push({
        id: nodeId,
        type: "CUSTOM",
        protocol: "CUSTOM",
        label: block.params.label || "Custom Block",
        params: customParams,
        inputs: customInputs,
        outputs: customOutputs
      });

      // Helper to resolve friendly node IDs to actual builder IDs
      const resolveNodeId = (friendlyId: string): string => {
        // 1. Check if it's already a valid ID
        if (nodes.find(n => n.id === friendlyId)) return friendlyId;

        // 2. Heuristic mapping
        if (friendlyId.startsWith('borrow')) {
           const match = nodes.find(n => n.type === 'FLASH_BORROW');
           if (match) return match.id;
        } else if (friendlyId.startsWith('swap')) {
           const prevNode = nodes[nodes.length - 2];
           if (prevNode) return prevNode.id;
        } else if (friendlyId.startsWith('node_')) {
           // Fallback for mismatched node_ indexes
           const prevNode = nodes[nodes.length - 2];
           if (prevNode) return prevNode.id;
        }
        
        return friendlyId; // Return original if no match found
      };

      // 1. Fix references in params.arguments
      if (Array.isArray(customParams.arguments)) {
        customParams.arguments = customParams.arguments.map((arg: any) => {
          if (arg.input_ref && typeof arg.input_ref === 'string' && arg.input_ref.includes('.')) {
            const [nodeId, outputId] = arg.input_ref.split('.');
            const resolvedNodeId = resolveNodeId(nodeId);
            return { ...arg, input_ref: `${resolvedNodeId}.${outputId}` };
          }
          return arg;
        });
      }

      // 2. Fix references in inputs and generate edges
      Object.entries(customInputs).forEach(([inputName, sourceRef]) => {
        if (typeof sourceRef === 'string' && sourceRef.includes('.')) {
          let [sourceNodeId, sourceOutputId] = sourceRef.split('.');
          sourceNodeId = resolveNodeId(sourceNodeId);

          // Update the input value in the node inputs map as well
          customInputs[inputName] = `${sourceNodeId}.${sourceOutputId}`;

          edges.push({
            id: `edge_${nodeId}_${inputName}`,
            source: sourceNodeId,
            source_output: sourceOutputId,
            target: nodeId,
            target_input: inputName,
            edge_type: "CUSTOM_EDGE", 
            coin_type: "UNKNOWN"
          });
        }
      });

      // Update lastCoinOutputId for subsequent blocks (like Repay)
      if (customOutputs.length > 0) {
        const primaryCoinOutput = customOutputs.find((o: any) => o.output_type === 'COIN');
        if (primaryCoinOutput) {
          lastCoinOutputId = primaryCoinOutput.id;
          lastCoinNodeId = nodeId; // Update node ID here!
          // We don't easily know the coin type without parsing the type string, 
          // but we can try to extract it or default to UNKNOWN
          const typeMatch = primaryCoinOutput.type.match(/Coin<(.+)>/);
          lastCoinType = typeMatch ? typeMatch[1] : "UNKNOWN";
        }

        // Auto-cleanup: Destroy unused zero-value coins
        customOutputs.forEach((output: any) => {
           if (output.output_type === 'COIN' && output.id !== lastCoinOutputId) {
              // Extract T
              const typeMatch = output.type.match(/Coin<(.+)>/);
              if (typeMatch) {
                const coinType = typeMatch[1];
                const cleanupNodeId = `cleanup_${nodeId}_${output.id}`;
                
                nodes.push({
                  id: cleanupNodeId,
                  type: "CUSTOM",
                  protocol: "CUSTOM",
                  label: "Auto-Cleanup",
                  params: {
                    target: "0x2::coin::destroy_zero",
                    arguments: [
                      { type: "input", input_ref: `${nodeId}.${output.id}` }
                    ],
                    type_arguments: [coinType]
                  },
                  inputs: {
                    coin: `${nodeId}.${output.id}`
                  },
                  outputs: []
                });

                edges.push({
                  id: `edge_${cleanupNodeId}`,
                  source: nodeId,
                  source_output: output.id,
                  target: cleanupNodeId,
                  target_input: "coin",
                  edge_type: "CUSTOM_EDGE",
                  coin_type: coinType
                });
              }
           }
        });
      }

    }
  });

  return strategy;
}


