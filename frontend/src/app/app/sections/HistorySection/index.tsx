"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Terminal,
  Layers
} from "lucide-react";
import { ExecutionSteps } from "../TemplatesSection/components/ExecutionSteps";
import { StepsViewer } from "./components/StepsViewer";
import { ExecutionHistoryEntry } from "../TemplatesSection/components/types";

export function HistorySection() {
  const [history, setHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    loadHistory();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'execution_history') {
        loadHistory();
      }
    };

    // Also reload when the section becomes visible (tab/window focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadHistory();
      }
    };

    // Listen for execution history updates from TemplatesSection
    const handleExecutionUpdate = () => {
      loadHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('execution_history_updated', handleExecutionUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('execution_history_updated', handleExecutionUpdate);
    };
  }, []);

  const loadHistory = () => {
    const stored = localStorage.getItem('execution_history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Filter out invalid entries
        const validEntries = Array.isArray(parsed) ? parsed.filter((e: any) => e && e.id) : [];
        
        setHistory(validEntries);
      } catch (e) {
        console.error('Failed to parse history:', e);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all execution history?')) {
      localStorage.removeItem('execution_history');
      setHistory([]);
      // Dispatch event to sync other components
      window.dispatchEvent(new CustomEvent('execution_history_updated', { detail: null }));
    }
  };

  const filteredHistory = history.filter(entry => {
    const matchesSearch = entry.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.txDigest?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          HISTORY
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Track your transaction history
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by strategy name or tx digest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border-2 border-gray-800 pl-10 pr-4 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 border-2 font-mono text-xs uppercase transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-[#0a0a0a] border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-4 py-2 border-2 font-mono text-xs uppercase transition-colors ${
              statusFilter === 'success'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-[#0a0a0a] border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            Success ({history.filter(h => h.status === 'success').length})
          </button>
          <button
            onClick={() => setStatusFilter('error')}
            className={`px-4 py-2 border-2 font-mono text-xs uppercase transition-colors ${
              statusFilter === 'error'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-[#0a0a0a] border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            Failed ({history.filter(h => h.status === 'error').length})
          </button>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-red-500/10 border-2 border-red-500/50 text-red-400 font-mono text-xs uppercase hover:bg-red-500/20 transition-colors"
          >
            Clear History
          </button>
        )}
        
        <button
          onClick={loadHistory}
          className="px-4 py-2 bg-blue-500/10 border-2 border-blue-500/50 text-blue-400 font-mono text-xs uppercase hover:bg-blue-500/20 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="bg-[#0a0a0a] border-2 border-gray-800 p-12 text-center">
            <Terminal size={48} className="mx-auto mb-4 text-gray-700" />
            <p className="text-gray-500 font-mono text-sm">
              {history.length === 0 
                ? "No execution history yet. Run a strategy to see it here!"
                : "No results match your filters."}
            </p>
          </div>
        ) : (
          filteredHistory.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const statusColor = entry.status === 'success' ? 'green' : 'red';

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0a] border-2 border-gray-800 hover:border-gray-700 transition-colors"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="p-4 cursor-pointer flex items-start gap-4"
                >
                  {/* Status Icon */}
                  <div className="shrink-0 mt-1">
                    {entry.status === 'success' ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <XCircle size={20} className="text-red-500" />
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-pixel text-white text-sm truncate">
                        {entry.strategyName}
                      </h3>
                      <button className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={12} />
                        {entry.sender.slice(0, 6)}...{entry.sender.slice(-4)}
                      </div>
                      {entry.txDigest && (
                        <a
                          href={`https://suiscan.xyz/${entry.network}/tx/${entry.txDigest}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink size={12} />
                          View on SuiScan
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t-2 border-gray-800 p-4 space-y-6">
                        {/* Description */}
                        {entry.strategyDescription && (
                          <div>
                            <h4 className="text-xs font-mono text-gray-500 uppercase mb-2">Description</h4>
                            <p className="text-sm text-gray-400 font-mono">{entry.strategyDescription}</p>
                          </div>
                        )}

                        {/* Strategy Execution Steps Details - Show first as it's the main content */}
                        {entry.executionSteps && entry.executionSteps.length > 0 ? (
                          <div>
                            <h4 className="text-xs font-mono text-gray-500 uppercase mb-4 flex items-center gap-2">
                              <Layers size={14} className="text-blue-400" />
                              Strategy Execution Steps
                            </h4>
                            <StepsViewer
                              steps={entry.executionSteps}
                              stats={entry.stats}
                            />
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded">
                            <p className="text-xs font-mono text-yellow-400">
                              ⚠️ No execution steps recorded for this execution
                            </p>
                          </div>
                        )}

                        {/* Transaction Details */}
                        <div>
                          <h4 className="text-xs font-mono text-gray-500 uppercase mb-2">Transaction Details</h4>
                          <div className="bg-black/30 border border-white/[0.02] p-3 space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-gray-600">Digest:</span>
                              <span className="text-gray-400">{entry.txDigest || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-gray-600">Network:</span>
                              <span className="text-gray-400 uppercase">{entry.network}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-gray-600">Status:</span>
                              <span className={`text-${statusColor}-400 uppercase`}>{entry.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Execution Logs */}
                        {entry.logs && entry.logs.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono text-gray-500 uppercase mb-2">Transaction Execution Logs</h4>
                            <ExecutionSteps
                              logs={entry.logs}
                              status={entry.status === 'success' ? 'success' : 'error'}
                              txDigest={entry.txDigest}
                              onClose={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
