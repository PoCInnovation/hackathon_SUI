"use client";

import { Box, Grid } from "@mui/material";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useTokens } from "./hooks/useTokens";
import { useBlocks } from "./hooks/useBlocks";
import { useSimulation } from "./hooks/useSimulation";
import { BlockPalette } from "./components/BlockPalette";
import { Canvas } from "./components/Canvas";
import { SimulationResults } from "./components/SimulationResults";
import { BuilderHeader } from "./components/BuilderHeader";
import { PublishModal } from "./components/PublishModal";
import { JsonEditor } from "./components/JsonEditor";
import { useWorkflowActions, Strategy } from "@/hooks/useWorkflows";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Snackbar, Alert, ToggleButton, ToggleButtonGroup } from "@mui/material";

import { buildStrategyFromBlocks } from "./utils/strategyBuilder";
import { SaveStrategyModal } from "./components/SaveStrategyModal";

interface BuilderSectionProps {
  onNavigate?: (section: string) => void;
}

export function BuilderSection({ onNavigate }: BuilderSectionProps) {
  const currentAccount = useCurrentAccount();
  const tokenMap = useTokens();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const { uploadWorkflow } = useWorkflowActions();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [builderMode, setBuilderMode] = useState<'blocks' | 'json'>('blocks');
  const [rawJson, setRawJson] = useState<string>("");

  const {
    blocks,
    simulationResult,
    setSimulationResult,
    addBlock,
    removeBlock,
    updateBlockParam,
    clearBlocks,
  } = useBlocks();

  const {
    isSimulating,
    error,
    runSimulation,
    setError,
  } = useSimulation({
    blocks,
    tokenMap,
    senderAddress: currentAccount?.address || "",
    onSuccess: setSimulationResult,
    builderMode,
    rawJson,
  });

  const handleClear = () => {
    clearBlocks();
    setError(null);
  };

  const handleSaveClick = () => {
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (name: string, description: string) => {
    try {
      let strategy;
      if (builderMode === 'json') {
         try {
            const parsed = JSON.parse(rawJson);
            // Handle case where user pastes full JSON with { sender, strategy: { ... } }
            if (parsed.strategy && !parsed.id) {
               strategy = parsed.strategy;
            } else {
               strategy = parsed;
            }
         } catch (e) {
            throw new Error("Invalid JSON");
         }
      } else {
        strategy = buildStrategyFromBlocks(blocks, tokenMap, currentAccount?.address || "Anonymous");
      }
      
      // Update metadata with user input
      if (!strategy.meta) {
        strategy.meta = {};
      }
      strategy.meta.name = name;
      strategy.meta.description = description;
      strategy.meta.updated_at = Date.now();

      // Save to localStorage
      const savedStrategies = JSON.parse(localStorage.getItem("saved_strategies") || "[]");
      savedStrategies.push(strategy);
      localStorage.setItem("saved_strategies", JSON.stringify(savedStrategies));

      console.log("Strategy saved:", strategy);
      
      // Navigate to Strategy Folder (templates)
      if (onNavigate) {
        onNavigate("templates");
      }
    } catch (e) {
      console.error("Failed to save strategy:", e);
      alert("Failed to save strategy");
    }
  };
  const handlePublishClick = () => {
    if (!currentAccount) {
      setNotification({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }
    setPublishModalOpen(true);
  };

  const handlePublish = async (data: { name: string; description: string; price: number; tags: string[] }) => {
    if (!currentAccount) return;

    setPublishing(true);
    try {
      let strategy: Strategy;

      if (builderMode === 'json') {
        try {
          const parsed = JSON.parse(rawJson);
          strategy = {
            ...parsed,
            id: uuidv4(),
            version: '1.0.0',
            meta: {
              ...parsed.meta,
              name: data.name,
              author: currentAccount.address,
              description: data.description,
              created_at: Date.now(),
              updated_at: Date.now(),
              tags: data.tags,
              price_sui: data.price
            }
          };
        } catch (e) {
           throw new Error("Invalid JSON");
        }
      } else {
        // Convert blocks to nodes
        const nodes = blocks.map((block, index) => ({
        id: block.id,
        type: block.type,
        position: { x: 100 + (index * 250), y: 100 }, // Simple layout
        data: { 
          ...block.params,
          label: block.type.toUpperCase() 
        }
      }));

      // Generate linear edges
      const edges = blocks.slice(0, -1).map((block, index) => ({
        id: `e${block.id}-${blocks[index + 1].id}`,
        source: block.id,
        target: blocks[index + 1].id,
        type: 'smoothstep'
      }));

      strategy = {
        id: uuidv4(),
        version: '1.0.0',
        meta: {
          name: data.name,
          author: currentAccount.address,
          description: data.description,
          created_at: Date.now(),
          updated_at: Date.now(),
          tags: data.tags,
          price_sui: data.price
        },
        nodes,
        edges
      };
    }

      await uploadWorkflow(strategy);
      
      setNotification({ type: 'success', message: 'Workflow published successfully!' });
      setPublishModalOpen(false);
      clearBlocks();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to publish workflow' });
    } finally {
      setPublishing(false);
    }
  };



  return (
    <Box className="h-full flex flex-col gap-6">
      {/* Section Title */}
      <div className="mb-4">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          STRATEGY BUILDER
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Design and simulate your DeFi strategies
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-end mb-2">
        <ToggleButtonGroup
          value={builderMode}
          exclusive
          onChange={(_, newMode) => {
             if (newMode) setBuilderMode(newMode);
          }}
          aria-label="builder mode"
          sx={{
            backgroundColor: '#1E1E1E',
            '& .MuiToggleButton-root': {
              color: '#888',
              borderColor: '#333',
              '&.Mui-selected': {
                color: '#fff',
                backgroundColor: '#333',
              }
            }
          }}
        >
          <ToggleButton value="blocks" aria-label="blocks">
            Block Builder
          </ToggleButton>
          <ToggleButton value="json" aria-label="json">
            Raw JSON
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <BuilderHeader
        onClear={handleClear}
        onRunSimulation={runSimulation}
        onSave={handleSaveClick}
        isSimulating={isSimulating}
        hasBlocks={builderMode === 'blocks' ? blocks.length > 0 : rawJson.length > 0}
        simulationSuccess={!!simulationResult}
      />

      <SaveStrategyModal
        open={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleConfirmSave}
      />

      <Grid container spacing={4} className="flex-1 min-h-0">
        {/* Left Panel: Canvas */}
        <Grid size={{ xs: 12, md: 8 }} className="flex flex-col gap-4 h-full overflow-hidden">
          {builderMode === 'blocks' ? (
            <>
              {/* Block Palette */}
              <BlockPalette onAddBlock={addBlock} />

              {/* Canvas Area */}
              <Canvas
                blocks={blocks}
                tokenMap={tokenMap}
                onRemoveBlock={removeBlock}
                onUpdateBlockParam={updateBlockParam}
              />
            </>
          ) : (
            <JsonEditor value={rawJson} onChange={setRawJson} />
          )}
        </Grid>

        {/* Right Panel: Simulation Results */}
        <Grid size={{ xs: 12, md: 4 }} className="h-full">
          <SimulationResults
            simulationResult={simulationResult}
            error={error}
            blocksCount={blocks.length}
          />
        </Grid>
      </Grid>


      <PublishModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublish={handlePublish}
        loading={publishing}
      />

      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.type} 
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
