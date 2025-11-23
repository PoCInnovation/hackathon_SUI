"use client";

import { motion } from "framer-motion";
import { Terminal, CheckCircle, XCircle, Loader2, ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Log, ExecutionStatus } from "./types";

export type { Log, ExecutionStatus };

interface ExecutionConsoleProps {
  logs: Log[];
  status: ExecutionStatus;
  txDigest?: string;
  onClose: () => void;
}

export function ExecutionConsole({ logs, status, txDigest, onClose }: ExecutionConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-emerald-400 border-emerald-500/50';
      case 'error': return 'text-red-400 border-red-500/50';
      default: return 'text-blue-400 border-blue-500/50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle size={18} />;
      case 'error': return <XCircle size={18} />;
      case 'idle': return <Terminal size={18} />;
      default: return <Loader2 size={18} className="animate-spin" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`w-full bg-black/90 border-2 rounded-lg overflow-hidden font-mono text-sm relative ${getStatusColor().split(' ')[1]}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b bg-white/5 ${getStatusColor()}`}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="uppercase font-bold tracking-wider">
            {status === 'idle' ? 'READY' : status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {txDigest && (
            <a 
              href={`https://suiscan.xyz/mainnet/tx/${txDigest}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:text-white transition-colors underline decoration-dotted"
            >
              View on Explorer <ExternalLink size={10} />
            </a>
          )}
          <button onClick={onClose} className="hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div 
        ref={scrollRef}
        className="p-4 h-64 overflow-y-auto space-y-2 font-mono text-xs custom-scrollbar"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for execution...</div>
        )}
        
        {logs.map((log, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3"
          >
            <span className="text-gray-600 shrink-0">
              [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
            </span>
            <span className={`
              ${log.type === 'error' ? 'text-red-400' : ''}
              ${log.type === 'success' ? 'text-emerald-400' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'info' ? 'text-blue-300' : ''}
            `}>
              {log.type === 'info' && '> '}
              {log.message}
            </span>
          </motion.div>
        ))}
        
        {(status === 'building' || status === 'signing' || status === 'executing') && (
          <motion.div 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-2 h-4 bg-blue-500 inline-block ml-1 align-middle"
          />
        )}
      </div>
    </motion.div>
  );
}
