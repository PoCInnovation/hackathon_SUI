"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Block, BLOCK_TYPES } from "./types";
import { BlockCard } from "./BlockCard";
import { Plus } from "lucide-react";

interface CanvasProps {
  blocks: Block[];
  tokenMap: Record<string, string>;
  onRemoveBlock: (id: string) => void;
  onUpdateBlockParam: (id: string, key: string, value: string) => void;
}

export function Canvas({ blocks, tokenMap, onRemoveBlock, onUpdateBlockParam }: CanvasProps) {
  return (
    <div className="flex-1 bg-black border-2 border-gray-800 p-6 overflow-y-auto relative">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-cyan-500/20 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        {blocks.length === 0 ? (
          // Empty State
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full min-h-[500px]"
          >
            <div className="border-2 border-dashed border-gray-700 p-12 max-w-md text-center">
              <div className="mb-4">
                <div className="inline-flex p-4 bg-gray-900 border-2 border-gray-700">
                  <Plus size={40} className="text-gray-600" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-mono text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">
                ▸ INITIATE SEQUENCE
              </h3>
              <p className="font-mono text-xs text-gray-700">
                Select a module from the palette above
              </p>
            </div>
          </motion.div>
        ) : (
          // Blocks Stack
          <div className="flex flex-col items-center gap-0 max-w-2xl mx-auto pb-16">
            {/* Start Node */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex flex-col items-center gap-2"
            >
              <div className="px-4 py-2 border border-cyan-500/50 bg-cyan-500/10 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                ▼ START
              </div>
              <div className="h-6 w-px bg-gradient-to-b from-cyan-500/50 to-transparent" />
            </motion.div>

            {/* Block Stack */}
            <AnimatePresence mode="popLayout">
              {blocks.map((block, index) => {
                const blockDef = BLOCK_TYPES.find(t => t.type === block.type)!;
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    blockDef={blockDef}
                    index={index}
                    tokenMap={tokenMap}
                    onRemove={onRemoveBlock}
                    onUpdateParam={onUpdateBlockParam}
                    isLast={index === blocks.length - 1}
                  />
                );
              })}
            </AnimatePresence>

            {/* End Node */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <div className="h-6 w-px bg-gradient-to-b from-transparent to-emerald-500/50" />
              <div className="px-4 py-2 border border-emerald-500/50 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ▲ END
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

