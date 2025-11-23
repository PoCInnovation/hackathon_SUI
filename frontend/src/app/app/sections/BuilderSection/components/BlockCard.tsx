"use client";

import { motion } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";
import { Block, BlockTypeDef } from "./types";
import { AssetSelector } from "./AssetSelector";

import { CustomBlock } from "./CustomBlock";

interface BlockCardProps {
  block: Block;
  blockDef: BlockTypeDef;
  index: number;
  tokenMap: Record<string, string>;
  onRemove: (id: string) => void;
  onUpdateParam: (id: string, key: string, value: any) => void;
  isLast: boolean;
}

const getBlockColor = (type: string) => {
  switch (type) {
    case "flash_borrow":
      return { border: "#a855f7", glow: "#a855f740", text: "#c084fc" };
    case "swap":
      return { border: "#3b82f6", glow: "#3b82f640", text: "#60a5fa" };
    case "flash_repay":
      return { border: "#10b981", glow: "#10b98140", text: "#34d399" };
    case "custom":
      return { border: "#9333ea", glow: "#9333ea40", text: "#d8b4fe" };
    default:
      return { border: "#6b7280", glow: "#6b728040", text: "#9ca3af" };
  }
};

export function BlockCard({ 
  block, 
  blockDef, 
  index, 
  tokenMap, 
  onRemove, 
  onUpdateParam,
  isLast 
}: BlockCardProps) {
  const colors = getBlockColor(block.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="w-full relative group"
    >
      {/* Connection Line */}
      {index > 0 && (
        <div className="h-8 w-px bg-gray-800 mx-auto mb-4" />
      )}

      {/* Card Container */}
      <div 
        className="bg-[#0a0a0a] border-2 p-4 relative overflow-hidden transition-all duration-200 hover:border-opacity-100"
        style={{
          borderColor: `${colors.border}50`,
        }}
      >
        {/* Top Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3" style={{ backgroundColor: colors.border }} />
        <div className="absolute top-0 right-0 w-3 h-3" style={{ backgroundColor: colors.border }} />

        {/* Hover Glow */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 40px ${colors.glow}`,
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 relative z-10">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity">
              <GripVertical size={16} style={{ color: colors.text }} />
            </div>

            {/* Icon */}
            <div 
              className="p-2 border-2"
              style={{
                borderColor: colors.border,
                backgroundColor: '#000',
              }}
            >
              <blockDef.icon size={20} style={{ color: colors.text }} strokeWidth={2.5} />
            </div>

            {/* Label */}
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="font-mono text-sm font-bold uppercase tracking-wider"
                  style={{ color: colors.text }}
                >
                  {block.type === 'custom' ? (block.params.label || blockDef.label) : blockDef.label}
                </span>
                <span 
                  className="px-2 py-0.5 border font-mono text-[10px] font-bold"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: '#000',
                    color: colors.text,
                  }}
                >
                  #{index + 1}
                </span>
              </div>
              <div className="font-mono text-[9px] text-gray-600 mt-0.5">
                ID: {block.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => onRemove(block.id)}
            className="p-1.5 border border-red-900/50 hover:border-red-500 bg-red-950/30 hover:bg-red-900/30 text-red-400 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          {block.type === "flash_borrow" && (
            <>
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                  ▸ Asset
                </label>
                <AssetSelector
                  value={block.params.asset}
                  onChange={(value) => onUpdateParam(block.id, "asset", value)}
                  tokenMap={tokenMap}
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                  ▸ Amount (SUI)
                </label>
                <input
                  type="text"
                  value={block.params.amount}
                  onChange={(e) => onUpdateParam(block.id, "amount", e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-700 focus:border-gray-500 font-mono text-sm text-white outline-none transition-colors"
                  placeholder="0.0"
                />
              </div>
            </>
          )}

          {block.type === "swap" && (
            <>
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                  ▸ From
                </label>
                <AssetSelector
                  value={block.params.from}
                  onChange={(value) => onUpdateParam(block.id, "from", value)}
                  tokenMap={tokenMap}
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                  ▸ To
                </label>
                <AssetSelector
                  value={block.params.to}
                  onChange={(value) => onUpdateParam(block.id, "to", value)}
                  tokenMap={tokenMap}
                />
              </div>
            </>
          )}

          {block.type === "flash_repay" && (
            <div className="col-span-2 space-y-2">
              <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                ▸ Asset
              </label>
              <AssetSelector
                value={block.params.asset}
                onChange={(value) => onUpdateParam(block.id, "asset", value)}
                tokenMap={tokenMap}
              />
            </div>
          )}

          {block.type === "custom" && (
            <CustomBlock block={block} onUpdateParam={onUpdateParam} />
          )}
        </div>

        {/* Bottom Corners on Hover */}
        <motion.div 
          className="absolute bottom-0 left-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ backgroundColor: colors.border }} 
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ backgroundColor: colors.border }} 
        />
      </div>

      {/* Flow Arrow */}
      {!isLast && (
        <div className="h-8 w-px bg-gradient-to-b from-gray-800 to-transparent mx-auto mt-4" />
      )}
    </motion.div>
  );
}
