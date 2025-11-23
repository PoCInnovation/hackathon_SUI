import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Block, BlockType, SimulationResult } from "../components/types";

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const addBlock = (type: BlockType) => {
    let initialParams: Record<string, string> = {};

    switch (type) {
      case "flash_borrow":
        initialParams = { asset: "SUI", amount: "1000000000" };
        break;
      case "swap":
        initialParams = { 
          from: "SUI", 
          to: "USDC", 
          amount: "ALL",
          pool_id: "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630" // Default Cetus Pool
        };
        break;
      case "flash_repay":
        initialParams = { asset: "SUI" };
        break;
    }

    const newBlock: Block = {
      id: uuidv4(),
      type,
      params: initialParams,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSimulationResult(null);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSimulationResult(null);
  };

  const updateBlockParam = (id: string, key: string, value: string) => {
    setBlocks(prev => prev.map(b => 
      b.id === id ? { ...b, params: { ...b.params, [key]: value } } : b
    ));
    setSimulationResult(null);
  };

  const clearBlocks = () => {
    setBlocks([]);
    setSimulationResult(null);
  };

  return {
    blocks,
    simulationResult,
    setSimulationResult,
    addBlock,
    removeBlock,
    updateBlockParam,
    clearBlocks,
  };
}


