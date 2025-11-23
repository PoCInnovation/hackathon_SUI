"use client";

import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { Play, RefreshCw, Layers, Save, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BuilderHeaderProps {
  onClear: () => void;
  onRunSimulation: () => void;
  onSave: () => void;
  onPublish: () => void;
  isSimulating: boolean;
  hasBlocks: boolean;
  simulationSuccess: boolean;
}

export function BuilderHeader({ 
  onClear, 
  onRunSimulation, 
  onSave,
  onPublish,
  isSimulating, 
  hasBlocks,
  simulationSuccess 
}: BuilderHeaderProps) {
  return (
    <Box className="flex justify-between items-center">
      <div>
        <Typography 
          variant="h4" 
          className="font-pixel text-white mb-2 flex items-center gap-3 text-3xl font-bold tracking-wider uppercase"
          sx={{
            textShadow: '2px 2px 0px rgba(0, 0, 0, 0.8), 4px 4px 0px rgba(0, 0, 0, 0.4)',
            imageRendering: 'pixelated',
            WebkitFontSmoothing: 'none',
            fontSmoothing: 'none',
            lineHeight: 1.2,
          }}
        >
          <Layers className="text-blue-500" />
          BLOCK BUILDER
        </Typography>
        <Typography className="text-gray-400 font-mono text-xs tracking-widest uppercase">
          Assemble your DeFi logic blocks
        </Typography>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={onClear}
          sx={{
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 'bold',
            fontSize: '12px',
            padding: '10px 20px',
            border: '2px solid',
            borderColor: '#374151',
            color: '#9ca3af',
            backgroundColor: '#050505',
            borderRadius: 0,
            boxShadow: 'inset 0 0 0 1px rgba(55, 65, 81, 0.3), 0 2px 0 rgba(0, 0, 0, 0.5)',
            '&:hover': {
              borderColor: '#ef4444',
              color: '#fca5a5',
              backgroundColor: '#1a0505',
              boxShadow: 'inset 0 0 0 1px rgba(239, 68, 68, 0.3), 0 2px 0 rgba(0, 0, 0, 0.5)',
            },
            '&:active': {
              boxShadow: 'inset 0 2px 0 rgba(0, 0, 0, 0.5)',
              transform: 'translateY(1px)',
            },
          }}
        >
          CLEAR
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Upload size={16} />}
          onClick={onPublish}
          disabled={!hasBlocks || isSimulating}
          sx={{
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 'bold',
            fontSize: '12px',
            padding: '10px 20px',
            border: '2px solid',
            borderColor: '#374151',
            color: '#9ca3af',
            backgroundColor: '#050505',
            borderRadius: 0,
            boxShadow: 'inset 0 0 0 1px rgba(55, 65, 81, 0.3), 0 2px 0 rgba(0, 0, 0, 0.5)',
            '&:hover': {
              borderColor: '#3b82f6',
              color: '#60a5fa',
              backgroundColor: '#0a101f',
              boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.3), 0 2px 0 rgba(0, 0, 0, 0.5)',
            },
            '&:active': {
              boxShadow: 'inset 0 2px 0 rgba(0, 0, 0, 0.5)',
              transform: 'translateY(1px)',
            },
            '&.Mui-disabled': {
              borderColor: '#1f2937',
              color: '#374151',
              boxShadow: 'none',
            }
          }}
        >
          PUBLISH
        </Button>
        <Button
          variant="contained"
          startIcon={isSimulating ? <CircularProgress size={16} color="inherit" sx={{ color: 'inherit' }} /> : <Play size={16} />}
          onClick={onRunSimulation}
          disabled={!hasBlocks || isSimulating}
          sx={{
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 'bold',
            fontSize: '12px',
            padding: '10px 24px',
            border: '2px solid',
            borderRadius: 0,
            ...(!hasBlocks || isSimulating
              ? {
                  borderColor: '#374151',
                  color: '#4b5563',
                  backgroundColor: '#0a0a0a',
                  boxShadow: 'inset 0 0 0 1px rgba(55, 65, 81, 0.2)',
                }
              : {
                  borderColor: '#3b82f6',
                  color: '#ffffff',
                  backgroundColor: '#1e3a8a',
                  boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.4), 0 3px 0 rgba(0, 0, 0, 0.6)',
                  '&:hover': {
                    backgroundColor: '#1e40af',
                    borderColor: '#60a5fa',
                    boxShadow: 'inset 0 0 0 1px rgba(96, 165, 250, 0.5), 0 3px 0 rgba(0, 0, 0, 0.6)',
                  },
                  '&:active': {
                    boxShadow: 'inset 0 3px 0 rgba(0, 0, 0, 0.6)',
                    transform: 'translateY(2px)',
                  },
                }),
          }}
        >
          {isSimulating ? "PROCESSING..." : "EXECUTE SIMULATION"}
        </Button>

        <AnimatePresence>
          {simulationSuccess && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.8 }}
              animate={{ opacity: 1, width: 'auto', scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.8 }}
              className="overflow-hidden"
            >
              <Button
                variant="contained"
                startIcon={<Save size={16} />}
                onClick={onSave}
                sx={{
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  padding: '10px 24px',
                  border: '2px solid',
                  borderRadius: 0,
                  borderColor: '#10b981',
                  color: '#ffffff',
                  backgroundColor: '#064e3b',
                  whiteSpace: 'nowrap',
                  boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.4), 0 3px 0 rgba(0, 0, 0, 0.6)',
                  '&:hover': {
                    backgroundColor: '#065f46',
                    borderColor: '#34d399',
                    boxShadow: 'inset 0 0 0 1px rgba(52, 211, 153, 0.5), 0 3px 0 rgba(0, 0, 0, 0.6)',
                  },
                  '&:active': {
                    boxShadow: 'inset 0 3px 0 rgba(0, 0, 0, 0.6)',
                    transform: 'translateY(2px)',
                  },
                }}
              >
                SAVE STRATEGY
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Box>
  );
}
