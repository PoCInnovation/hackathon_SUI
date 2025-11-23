"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRightLeft, CornerDownLeft, Plus } from "lucide-react";
import { BlockType } from "./types";

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

const BLOCK_PALETTE = [
  { 
    type: "flash_borrow" as BlockType, 
    label: "FLASH BORROW", 
    icon: Zap,
    color: "#a855f7",
    glow: "#a855f740",
  },
  { 
    type: "swap" as BlockType, 
    label: "DEX SWAP", 
    icon: ArrowRightLeft,
    color: "#3b82f6",
    glow: "#3b82f640",
  },
  { 
    type: "flash_repay" as BlockType, 
    label: "FLASH REPAY", 
    icon: CornerDownLeft,
    color: "#10b981",
    glow: "#10b98140",
  },
  { 
    type: "custom" as BlockType, 
    label: "CUSTOM BLOCK", 
    icon: Plus,
    color: "#9333ea",
    glow: "#9333ea40",
  },
];

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="p-4 bg-black border-2 border-gray-800">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest mb-0.5">
            ▸ BLOCK PALETTE
          </h2>
          <p className="font-mono text-[10px] text-gray-600">
            Select module to add
          </p>
        </div>
        <div className="text-[10px] font-mono text-gray-700">
          [3 MODULES AVAILABLE]
        </div>
      </div>

      {/* Block Grid */}
      <div className="grid grid-cols-3 gap-3">
        {BLOCK_PALETTE.map((block, index) => (
          <motion.button
            key={block.type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddBlock(block.type)}
            className="relative group"
          >
            {/* Card with sharp corners */}
            <div 
              className="bg-[#0a0a0a] border-2 hover:border-opacity-100 p-3 transition-all duration-200 relative overflow-hidden h-24 flex flex-col items-center justify-center"
              style={{
                borderColor: `${block.color}50`,
                boxShadow: `0 0 0 rgba(0,0,0,0)`,
              }}
            >
              {/* Subtle glow on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 20px ${block.glow}`,
                }}
              />

              {/* Corner accents - Smaller */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5" style={{ backgroundColor: block.color }} />
              <div className="absolute top-0 right-0 w-1.5 h-1.5" style={{ backgroundColor: block.color }} />
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: block.color }} />
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: block.color }} />

              {/* Icon */}
              <div className="mb-2 relative z-10">
                <div 
                  className="p-2 border"
                  style={{
                    borderColor: block.color,
                    backgroundColor: '#000',
                  }}
                >
                  <block.icon 
                    size={18} 
                    style={{ 
                      color: block.color,
                      filter: `drop-shadow(0 0 5px ${block.color})`,
                    }}
                    strokeWidth={2.5}
                  />
                </div>
              </div>

              {/* Label */}
              <div 
                className="font-mono text-[10px] font-bold text-center tracking-wider relative z-10"
                style={{
                  color: block.color,
                  textShadow: `0 0 5px ${block.glow}, 1px 1px 0 #000`,
                }}
              >
                {block.label}
              </div>

              {/* Add button on hover */}
              <motion.div
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              >
                <Plus size={10} style={{ color: block.color }} />
              </motion.div>
            </div>

            {/* Subtle shadow */}
            <div 
              className="absolute inset-0 -z-10 translate-x-1 translate-y-1 border-2"
              style={{
                borderColor: '#222',
                backgroundColor: '#0a0a0a',
              }}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

