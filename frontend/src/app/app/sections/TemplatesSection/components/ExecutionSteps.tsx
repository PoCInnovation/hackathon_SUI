"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ChevronDown, ExternalLink, AlertCircle, Terminal, Minimize2, Maximize2 } from "lucide-react";
import { useState } from "react";
import { Log, ExecutionStatus } from "./types";

interface ExecutionStepsProps {
  logs: Log[];
  status: ExecutionStatus;
  txDigest?: string;
  onClose: () => void;
}

interface StepBlockProps {
  number: number;
  title: string;
  subtitle: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  logs?: Log[];
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: () => void;
  customIcon?: React.ReactNode;
  isCollapsed?: boolean;
}

function StepBlock({ number, title, subtitle, status, logs, isExpanded, onToggle, onClick, customIcon, isCollapsed }: StepBlockProps) {
  const isClickable = !!onClick || (logs && logs.length > 0);

  return (
    <div className="flex gap-4">
      {/* Number Column */}
      <div className="flex flex-col items-center">
        <div className={`
          w-8 h-8 flex items-center justify-center border text-xs font-mono transition-colors duration-300
          ${status === 'active' ? 'border-blue-500 text-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : ''}
          ${status === 'completed' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''}
          ${status === 'error' ? 'border-red-500 text-red-400 bg-red-500/10' : ''}
          ${status === 'pending' ? 'border-gray-800 text-gray-600 bg-gray-900' : ''}
        `}>
          {status === 'completed' ? <Check size={14} /> : 
           status === 'error' ? <AlertCircle size={14} /> :
           status === 'active' ? <Loader2 size={14} className="animate-spin" /> :
           number}
        </div>
        {/* Connector Line */}
        <div className={`w-0.5 flex-1 my-2 ${status === 'completed' ? 'bg-emerald-500/30' : 'bg-gray-800'}`} />
      </div>

      {/* Content Column */}
      <div className="flex-1 pb-6">
        <div 
          onClick={() => {
            if (onClick) onClick();
            else if (isClickable) onToggle();
          }}
          className={`
            bg-[#0a0f1e]/50 border p-4 cursor-pointer transition-all duration-200 group relative overflow-hidden
            ${status === 'active' ? 'border-blue-500/30' : 'border-white/[0.03] hover:border-white/[0.06]'}
            ${status === 'error' ? 'border-red-500/30' : ''}
            ${status === 'completed' ? 'border-emerald-500/20' : ''}
          `}
        >
          {/* Active Scanline */}
          {status === 'active' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
          )}

          <div className="flex justify-between items-center relative z-10">
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">{subtitle}</div>
              <div className={`font-bold font-mono text-sm ${status === 'active' ? 'text-white' : 'text-gray-400'}`}>
                {title}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {customIcon}
              {logs && logs.length > 0 && !isCollapsed && (
                <ChevronDown 
                  size={16} 
                  className={`text-gray-700 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Logs */}
        <AnimatePresence>
          {isExpanded && logs && !isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3 bg-black/30 border border-white/[0.02] font-mono text-[10px] text-gray-600 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className={`
                    ${log.type === 'error' ? 'text-red-500/70' : ''}
                    ${log.type === 'success' ? 'text-emerald-500/60' : ''}
                  `}>
                    <span className="opacity-40 mr-2">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                    {log.message}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ExecutionSteps({ logs, status, txDigest, onClose }: ExecutionStepsProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  // Determine step states
  const getBuildStatus = () => {
    if (status === 'idle') return 'pending';
    if (status === 'building') return 'active';
    if (status === 'error' && logs.some(l => l.message.includes('Build'))) return 'error';
    return 'completed';
  };

  const getSignStatus = () => {
    if (['idle', 'building'].includes(status)) return 'pending';
    if (status === 'signing') return 'active';
    if (status === 'error' && logs.some(l => l.message.includes('signature'))) return 'error';
    return 'completed';
  };

  const getExecStatus = () => {
    if (['idle', 'building', 'signing'].includes(status)) return 'pending';
    if (status === 'executing') return 'active';
    if (status === 'error' && !logs.some(l => l.message.includes('Build') || l.message.includes('signature'))) return 'error';
    return 'completed';
  };

  return (
    <div className="w-full">
      {/* Header with Collapse/Expand Toggle */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-500/70" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Execution Status</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-white/5 text-gray-600 hover:text-gray-400 transition-colors rounded"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Step 1: Build */}
            <StepBlock 
              number={1}
              title="BUILD TRANSACTION"
              subtitle="BACKEND"
              status={getBuildStatus()}
              logs={logs.filter(l => l.message.toLowerCase().includes('build') || l.message.toLowerCase().includes('size'))}
              isExpanded={expandedStep === 1}
              onToggle={() => toggleStep(1)}
              isCollapsed={isCollapsed}
            />

            {/* Step 2: Sign */}
            <StepBlock 
              number={2}
              title="WALLET SIGNATURE"
              subtitle="USER ACTION"
              status={getSignStatus()}
              logs={logs.filter(l => l.message.toLowerCase().includes('signature') || l.message.toLowerCase().includes('wallet'))}
              isExpanded={expandedStep === 2}
              onToggle={() => toggleStep(2)}
              isCollapsed={isCollapsed}
            />

            {/* Step 3: Execute */}
            <StepBlock 
              number={3}
              title="NETWORK EXECUTION"
              subtitle="SUI MAINNET"
              status={getExecStatus()}
              logs={logs.filter(l => !l.message.toLowerCase().includes('build') && !l.message.toLowerCase().includes('signature') && !l.message.includes('Digest'))}
              isExpanded={expandedStep === 3}
              onToggle={() => toggleStep(3)}
              isCollapsed={isCollapsed}
            />

            {/* Step 4: Explorer Link (Only on Success) */}
            <AnimatePresence>
              {status === 'success' && txDigest && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <StepBlock 
                    number={4}
                    title="VIEW ON EXPLORER"
                    subtitle="SUISCAN"
                    status="completed"
                    isExpanded={false}
                    onToggle={() => {}}
                    onClick={() => window.open(`https://suiscan.xyz/mainnet/tx/${txDigest}`, '_blank')}
                    customIcon={<ExternalLink size={16} className="text-blue-400" />}
                    isCollapsed={isCollapsed}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
