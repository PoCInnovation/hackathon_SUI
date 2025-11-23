"use client";

import { Block } from "./types";

interface CustomBlockProps {
  block: Block;
  onUpdateParam: (id: string, key: string, value: any) => void;
}

export function CustomBlock({ block, onUpdateParam }: CustomBlockProps) {
  const handleJsonChange = (key: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      onUpdateParam(block.id, key, parsed);
    } catch (e) {
      // Allow invalid JSON while typing, but maybe store it as string in a temporary state?
      // For now, we'll just update the raw value if we change the architecture to store raw strings and parse on save.
      // But since our Block params are 'any', we might want to store the string representation in a separate local state or 
      // just assume the user is pasting valid JSON.
      
      // Actually, to support editing, we should probably store the string value in the block params 
      // and only parse it when generating the strategy. 
      // But the types say `params: Record<string, any>`.
      
      // Let's assume for this "Power User" feature, we update the value directly if it parses, 
      // or maybe we should change the strategy builder to handle stringified JSON.
      
      // Better approach: Store as is, and let the user ensure it is valid. 
      // But `onUpdateParam` expects `any`.
      
      // Let's just pass the raw string for now and handle parsing in the builder?
      // No, the builder expects objects.
      
      // Let's try to parse. If it fails, we don't update the upstream state? That makes typing impossible.
      // We need to store the string representation in the state for the textarea to work.
    }
  };

  // Helper to safely stringify for display
  const safeStringify = (val: any) => {
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return '';
    }
  };

  return (
    <div className="col-span-2 space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
          ▸ Label
        </label>
        <input
          type="text"
          value={block.params.label || ""}
          onChange={(e) => onUpdateParam(block.id, "label", e.target.value)}
          className="w-full px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-sm text-white outline-none transition-colors"
          placeholder="My Custom Block"
        />
      </div>

      {/* Target */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
          ▸ Target Function
        </label>
        <input
          type="text"
          value={block.params.target || ""}
          onChange={(e) => onUpdateParam(block.id, "target", e.target.value)}
          className="w-full px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-xs text-purple-300 outline-none transition-colors"
          placeholder="0x...::module::function"
        />
      </div>

      {/* Arguments */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
          <span>▸ Arguments (JSON Array)</span>
          <span className="text-[9px] text-gray-600">Array of objects</span>
        </label>
        <textarea
          value={safeStringify(block.params.arguments)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onUpdateParam(block.id, "arguments", parsed);
            } catch {
              // If we can't parse, we might want to store the string temporarily?
              // For this MVP, let's just update the param with the string and handle it in the builder or 
              // assume the user will fix the JSON.
              onUpdateParam(block.id, "arguments", e.target.value);
            }
          }}
          className="w-full h-32 px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-[10px] text-gray-300 outline-none transition-colors resize-y"
          placeholder='[{"type": "pure", "value": "..."}]'
        />
      </div>

      {/* Type Arguments */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
          <span>▸ Type Arguments (JSON Array)</span>
          <span className="text-[9px] text-gray-600">Array of strings</span>
        </label>
        <textarea
          value={safeStringify(block.params.type_arguments)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onUpdateParam(block.id, "type_arguments", parsed);
            } catch {
              onUpdateParam(block.id, "type_arguments", e.target.value);
            }
          }}
          className="w-full h-24 px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-[10px] text-gray-300 outline-none transition-colors resize-y"
          placeholder='["0x2::sui::SUI", "..."]'
        />
      </div>

      {/* Inputs */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
          <span>▸ Inputs (JSON Object)</span>
          <span className="text-[9px] text-gray-600">Map input names to sources</span>
        </label>
        <textarea
          value={safeStringify(block.params.inputs)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onUpdateParam(block.id, "inputs", parsed);
            } catch {
              onUpdateParam(block.id, "inputs", e.target.value);
            }
          }}
          className="w-full h-24 px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-[10px] text-gray-300 outline-none transition-colors resize-y"
          placeholder='{"coin_in": "prev_block.output"}'
        />
      </div>

      {/* Outputs */}
      <div className="space-y-2">
        <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
          <span>▸ Outputs (JSON Array)</span>
          <span className="text-[9px] text-gray-600">Define output types</span>
        </label>
        <textarea
          value={safeStringify(block.params.outputs)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onUpdateParam(block.id, "outputs", parsed);
            } catch {
              onUpdateParam(block.id, "outputs", e.target.value);
            }
          }}
          className="w-full h-32 px-3 py-2 bg-black border border-gray-700 focus:border-purple-500 font-mono text-[10px] text-gray-300 outline-none transition-colors resize-y"
          placeholder='[{"id": "out1", "type": "Coin<...>", "output_type": "COIN"}]'
        />
      </div>
    </div>
  );
}
