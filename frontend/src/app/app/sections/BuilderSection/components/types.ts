import { Repeat, ArrowDownLeft, ArrowUpRight, Zap } from "lucide-react";

export type BlockType = "flash_borrow" | "swap" | "flash_repay" | "custom";

export interface Block {
  id: string;
  type: BlockType;
  params: Record<string, any>; // Changed to any to support complex objects for custom blocks
}

export interface SimulationResult {
  success: boolean;
  estimated_gas: number;
  estimated_profit_loss: Array<{ token?: string; amount: string; coin_type?: string }>;
  errors: Array<{ message: string }>;
}

export interface BlockTypeDef {
  type: BlockType;
  label: string;
  indicator: string;
  icon: any;
}

export const BLOCK_TYPES: BlockTypeDef[] = [
  { type: "flash_borrow", label: "FLASH BORROW", indicator: "bg-amber-600", icon: Zap },
  { type: "swap", label: "SWAP", indicator: "bg-blue-600", icon: Repeat },
  { type: "flash_repay", label: "FLASH REPAY", indicator: "bg-emerald-600", icon: ArrowDownLeft },
  { type: "custom", label: "CUSTOM", indicator: "bg-purple-600", icon: Zap },
];


