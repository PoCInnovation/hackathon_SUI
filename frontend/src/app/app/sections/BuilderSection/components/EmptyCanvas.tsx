"use client";

import { Typography } from "@mui/material";
import { Plus } from "lucide-react";

export function EmptyCanvas() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 pointer-events-none">
      <div className="w-24 h-24 border-2 border-dashed border-gray-800 rounded-2xl mb-6 flex items-center justify-center animate-pulse">
        <Plus size={32} />
      </div>
      <Typography className="font-pixel text-lg opacity-40">
        INITIATE SEQUENCE
      </Typography>
      <Typography className="font-mono text-xs opacity-30 mt-2">
        Select a module from the palette above
      </Typography>
    </div>
  );
}


