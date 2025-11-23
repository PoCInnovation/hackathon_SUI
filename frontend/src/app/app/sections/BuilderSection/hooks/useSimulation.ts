import { useState } from "react";
import { SimulationResult } from "../components/types";
import { buildStrategyFromBlocks } from "../utils/strategyBuilder";
import { Block } from "../components/types";
import { api } from "@/services/api";

interface UseSimulationProps {
  blocks: Block[];
  tokenMap: Record<string, string>;
  senderAddress: string;
  onSuccess: (result: SimulationResult) => void;
}

export function useSimulation({ blocks, tokenMap, senderAddress, onSuccess }: UseSimulationProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    if (!senderAddress) {
      setError("Please connect your wallet first");
      return;
    }

    setIsSimulating(true);
    setError(null);

    try {
      // Build strategy from blocks
      const strategy = buildStrategyFromBlocks(blocks, tokenMap, senderAddress);
      
      // Debug: log the generated strategy
      console.log("Generated Strategy JSON:", JSON.stringify(strategy, null, 2));

      // 1. Validate
      const validateData = await api.validateStrategy(strategy);

      if (!validateData.valid) {
        const errorMsg = validateData.errors.map((e: any) => `${e.rule_id}: ${e.message}`).join("\n");
        throw new Error(errorMsg || "Validation failed");
      }

      // 2. Simulate
      const simulateData = await api.simulateStrategy(strategy, senderAddress);

      if (!simulateData.success && simulateData.errors?.length > 0) {
        throw new Error(simulateData.errors[0].message);
      }

      onSuccess(simulateData);
    } catch (err: any) {
      setError(err.message || "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  return {
    isSimulating,
    error,
    runSimulation,
    setError,
  };
}


