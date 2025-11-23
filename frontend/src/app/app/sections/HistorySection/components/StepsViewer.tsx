"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, AlertCircle, Loader2, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";
import { ExecutionStepDetail } from "../../TemplatesSection/components/types";

interface StepsViewerProps {
  steps: ExecutionStepDetail[];
  stats?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
    totalGasDisplay?: string;
    netProfitLossDisplay?: string;
  };
}

export function StepsViewer({ steps, stats }: StepsViewerProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const getStepIcon = (status: ExecutionStepDetail['status']) => {
    switch (status) {
      case 'success':
        return <Check size={16} className="text-emerald-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      case 'executing':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      default:
        return <div className="w-4 h-4 border border-gray-600 rounded-full" />;
    }
  };

  const getStepStatusColor = (status: ExecutionStepDetail['status']) => {
    switch (status) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'executing':
        return 'border-blue-500/30 bg-blue-500/5';
      default:
        return 'border-gray-800/50 bg-gray-900/20';
    }
  };

  const getTypeColor = (type: ExecutionStepDetail['type']) => {
    switch (type) {
      case 'FLASH_BORROW':
        return 'text-blue-400 bg-blue-500/10';
      case 'FLASH_REPAY':
        return 'text-purple-400 bg-purple-500/10';
      case 'DEX_SWAP':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'COIN_MERGE':
        return 'text-amber-400 bg-amber-500/10';
      case 'COIN_SPLIT':
        return 'text-cyan-400 bg-cyan-500/10';
      case 'CUSTOM':
        return 'text-purple-400 bg-purple-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#0a0f1e] border border-white/5 p-3 rounded">
            <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Total Steps</div>
            <div className="text-2xl font-mono font-bold text-white">{stats.totalSteps}</div>
          </div>
          <div className="bg-[#0a0f1e] border border-emerald-500/20 p-3 rounded">
            <div className="text-[10px] text-emerald-400 font-mono uppercase mb-1">Successful</div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{stats.successfulSteps}</div>
          </div>
          {stats.failedSteps > 0 && (
            <div className="bg-[#0a0f1e] border border-red-500/20 p-3 rounded">
              <div className="text-[10px] text-red-400 font-mono uppercase mb-1">Failed</div>
              <div className="text-2xl font-mono font-bold text-red-400">{stats.failedSteps}</div>
            </div>
          )}
          {stats.totalGasDisplay && (
            <div className="bg-[#0a0f1e] border border-orange-500/20 p-3 rounded">
              <div className="text-[10px] text-orange-400 font-mono uppercase mb-1">Gas Used</div>
              <div className="text-lg font-mono font-bold text-orange-400">{stats.totalGasDisplay}</div>
            </div>
          )}
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Step Card */}
            <div
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              className={`
                border p-4 rounded cursor-pointer transition-all duration-200 group
                ${getStepStatusColor(step.status)}
                hover:border-opacity-100
              `}
            >
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="shrink-0">
                  {getStepIcon(step.status)}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      Step {step.order}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${getTypeColor(step.type)}`}>
                      {step.type}
                    </span>
                    <span className="text-[10px] text-gray-600">{step.protocol}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    {/* Input Amount */}
                    {step.inputs?.amountDisplay && (
                      <>
                        <span className="font-mono text-xs text-emerald-400">
                          {step.inputs.amountDisplay}
                        </span>
                        <ArrowRight size={12} className="text-gray-600" />
                      </>
                    )}

                    {/* Output Amount */}
                    {step.outputs?.amountDisplay && (
                      <span className="font-mono text-xs text-blue-400">
                        {step.outputs.amountDisplay}
                      </span>
                    )}

                    {/* Profit/Loss */}
                    {step.profitLoss?.amountDisplay && (
                      <span
                        className={`font-mono text-xs ml-auto ${
                          step.profitLoss.isProfit ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {step.profitLoss.isProfit ? '+' : ''}{step.profitLoss.amountDisplay}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand Icon */}
                <ChevronDown
                  size={16}
                  className={`text-gray-600 transition-transform duration-300 shrink-0 ${
                    expandedStep === step.id ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedStep === step.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-white/5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Inputs */}
                      {step.inputs && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Inputs</h4>
                          <div className="space-y-1.5 text-xs">
                            {step.inputs.amountDisplay && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="text-gray-300 font-mono">{step.inputs.amountDisplay}</span>
                              </div>
                            )}
                            {step.inputs.coinType && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Coin:</span>
                                <span className="text-gray-300 font-mono text-[9px] truncate">
                                  {step.inputs.coinType.slice(-10)}
                                </span>
                              </div>
                            )}
                            {step.inputs.pool && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Pool:</span>
                                <span className="text-gray-300 font-mono text-[9px] truncate">
                                  {step.inputs.pool.slice(-8)}
                                </span>
                              </div>
                            )}
                            {step.inputs.direction && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Direction:</span>
                                <span className="text-gray-300 font-mono">{step.inputs.direction}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Outputs */}
                      {step.outputs && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Outputs</h4>
                          <div className="space-y-1.5 text-xs">
                            {step.outputs.amountDisplay && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Received:</span>
                                <span className="text-emerald-400 font-mono">{step.outputs.amountDisplay}</span>
                              </div>
                            )}
                            {step.outputs.coinType && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Coin:</span>
                                <span className="text-gray-300 font-mono text-[9px] truncate">
                                  {step.outputs.coinType.slice(-10)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Gas */}
                      {step.gas && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Zap size={12} />
                            Gas
                          </h4>
                          <div className="space-y-1.5 text-xs">
                            {step.gas.actualGas && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Used:</span>
                                <span className="text-gray-300 font-mono">
                                  {step.gas.gasDisplay || `${(step.gas.actualGas / 1_000_000_000).toFixed(4)} SUI`}
                                </span>
                              </div>
                            )}
                            {step.gas.estimatedGas && !step.gas.actualGas && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Estimated:</span>
                                <span className="text-gray-400 font-mono">
                                  {(step.gas.estimatedGas / 1_000_000_000).toFixed(4)} SUI
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Profit/Loss */}
                      {step.profitLoss && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">P&L</h4>
                          <div className="space-y-1.5 text-xs">
                            <div
                              className={`flex justify-between font-mono ${
                                step.profitLoss.isProfit ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              <span className="text-gray-500">Change:</span>
                              <span>{step.profitLoss.isProfit ? '+' : ''}{step.profitLoss.amountDisplay}</span>
                            </div>
                            {step.profitLoss.token && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Token:</span>
                                <span className="text-gray-300">{step.profitLoss.token}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {step.error && (
                        <div className="col-span-2 space-y-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                          <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Error</h4>
                          <p className="text-xs text-red-300 font-mono break-words">{step.error.message}</p>
                          {step.error.details && (
                            <p className="text-xs text-red-400/70 font-mono">{step.error.details}</p>
                          )}
                        </div>
                      )}

                      {/* Logs */}
                      {step.logs && step.logs.length > 0 && (
                        <div className="col-span-2 space-y-2">
                          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Logs</h4>
                          <div className="bg-black/30 border border-white/5 p-2 rounded text-[9px] text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                            {step.logs.map((log, i) => (
                              <div key={i}>{log}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Duration */}
                      {step.duration && (
                        <div className="col-span-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Duration:</span>
                            <span className="text-gray-300 font-mono">{step.duration}ms</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Arrow between steps */}
            {index < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight size={14} className="text-gray-700 rotate-90" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p className="text-sm font-mono">No execution steps recorded</p>
        </div>
      )}
    </div>
  );
}
