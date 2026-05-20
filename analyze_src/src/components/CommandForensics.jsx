import React, { useState } from 'react';
import { Activity, Maximize2, Minimize2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import VisualDiagnostics from './VisualDiagnostics';

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

const PollingSummaryPanel = ({ summary }) => {
  if (!summary || summary.chainCount === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[250px]">
        <h3 className="text-[13px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-uguisu-light/80" />
          Polling & Status Activity
        </h3>
        <div className="flex items-center justify-center flex-1 min-h-[80px] text-text-muted text-[13px] font-sans">
          Waiting for JSONL
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[250px]">
      <h3 className="text-[13px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
        <Activity className="w-4 h-4 text-uguisu-light/80" />
        Polling & Status Activity
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-sans text-[13px]">
        <div className="flex justify-between items-center text-text-sub">
          <span>Polling Chains</span><span className="text-text-main font-mono font-bold">{summary.chainCount}</span>
        </div>
        <div className="flex justify-between items-center text-text-sub">
          <span>Avg Duration</span><span className="text-text-main font-mono font-bold">{summary.avgDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-text-sub">
          <span>Refresh</span><span className="text-uguisu-light font-mono font-bold">{summary.refreshCount}</span>
        </div>
        <div className="flex justify-between items-center text-text-sub">
          <span>Max Duration</span><span className="text-text-main font-mono font-bold">{summary.maxDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-text-sub">
          <span>Override</span><span className="text-gold-warning font-mono font-bold">{summary.overrideCount}</span>
        </div>
        <div className="flex justify-between items-center text-text-sub">
          <span>Skipped</span><span className="text-text-muted font-mono font-bold">{summary.skippedCount}</span>
        </div>
      </div>
    </div>
  );
};

const CommandSummaryCards = ({ chains }) => {
  const tradeChains = chains.filter(c => c.type === 'Trade');
  
  const executed = tradeChains.length;
  const failed = tradeChains.filter(c => c.retcode !== 'n/a' && c.retcode !== 10009 && c.retcode !== 0).length;
  
  const calcStats = (vals) => {
    const valid = vals.filter(v => typeof v === 'number' && !isNaN(v)).sort((a,b)=>a-b);
    return {
      median: valid.length > 0 ? valid[Math.floor(valid.length/2)] : 'n/a',
      p95: valid.length > 0 ? valid[Math.floor(valid.length * 0.95)] : 'n/a',
    };
  };

  const totalStats = calcStats(tradeChains.map(c => c.latencies.totalObserved));
  const coreStats = calcStats(tradeChains.map(c => c.latencies.coreExecution));
  const mt5Stats = calcStats(tradeChains.map(c => c.latencies.mt5Execution));

  let slowest = 'n/a';
  let maxTotal = -1;
  tradeChains.forEach(c => {
    if (typeof c.latencies.totalObserved === 'number' && c.latencies.totalObserved > maxTotal) {
      maxTotal = c.latencies.totalObserved;
      slowest = `${maxTotal}ms (${c.action})`;
    }
  });

  const actionCounts = {};
  tradeChains.forEach(c => actionCounts[c.action] = (actionCounts[c.action] || 0) + 1);
  let mostCommon = 'n/a';
  let maxCount = 0;
  Object.entries(actionCounts).forEach(([a, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = a;
    }
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">Executed / Failed</span>
        <span className="text-[20px] font-mono font-bold text-text-main mt-1">{executed} <span className="text-text-muted">/</span> <span className={`${failed > 0 ? 'text-enji-light animate-pulse' : 'text-text-main'}`}>{failed}</span></span>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">Most Common</span>
        <span className="text-[14px] font-sans font-bold text-uguisu-light mt-1 truncate">{mostCommon}</span>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">Total Obs (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-text-sub mt-1">{totalStats.median} <span className="text-[12px] text-text-muted">/ {totalStats.p95}</span></span>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">Core Exec (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-text-sub mt-1">{coreStats.median} <span className="text-[12px] text-text-muted">/ {coreStats.p95}</span></span>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">MT5 Exec (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-uguisu-light mt-1">{mt5Stats.median} <span className="text-[12px] text-text-muted">/ {mt5Stats.p95}</span></span>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">Slowest Cmd</span>
        <span className="text-[14px] font-sans font-bold text-gold-warning-light mt-1 truncate" title={slowest}>{slowest}</span>
      </div>
    </div>
  );
};

const CommandStepList = ({ events }) => {
  const startTs = new Date(events[0].timestamp).getTime();

  const maxDelta = Math.max(...events.map((ev, i) => {
    if (i === 0) return 0;
    const currentTs = new Date(ev.timestamp).getTime();
    const prevTs = new Date(events[i-1].timestamp).getTime();
    if (isNaN(currentTs) || isNaN(prevTs)) return 0;
    return Math.max(0, currentTs - prevTs);
  }), 1);
  
  return (
    <div className="p-4 border-l-2 border-uguisu overflow-x-auto shadow-inner bg-dark-surface">
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center gap-2 text-[12px] font-bold text-text-sub uppercase tracking-wider">
          <Activity className="w-4 h-4 text-uguisu-light/80" /> Command Execution Steps
        </div>
        <div className="text-[12px] font-sans text-text-muted flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 opacity-70" />
          Steps are displayed in logical command order. Out-of-order timestamps are marked instead of shown as negative latency.
        </div>
      </div>
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead className="text-[12px] font-sans font-semibold uppercase tracking-wider text-text-muted border-b border-dark-border/40">
          <tr>
            <th className="pb-2 px-3 font-semibold">Step</th>
            <th className="pb-2 px-3 font-semibold">Time</th>
            <th className="pb-2 px-3 font-semibold">Event</th>
            <th className="pb-2 px-3 font-semibold">Δ Timeline</th>
            <th className="pb-2 px-3 font-semibold text-right">Δ Start (ms)</th>
          </tr>
        </thead>
        <tbody className="text-[13px] divide-y divide-dark-border/20">
          {events.map((ev, i) => {
            const currentTs = new Date(ev.timestamp).getTime();
            const prevTs = i > 0 ? new Date(events[i-1].timestamp).getTime() : currentTs;
            
            const deltaPrev = isNaN(currentTs) || isNaN(prevTs) ? '-' : (currentTs - prevTs);
            const isOutOrderPrev = typeof deltaPrev === 'number' && deltaPrev < 0;
            const displayDeltaPrev = isOutOrderPrev ? 'out-of-order' : deltaPrev;
            
            const deltaStart = isNaN(currentTs) || isNaN(startTs) ? '-' : (currentTs - startTs);
            const isPreStart = typeof deltaStart === 'number' && deltaStart < 0;
            const displayDeltaStart = isPreStart ? 'pre-start' : deltaStart;
            
            const isHighDelta = typeof deltaPrev === 'number' && !isOutOrderPrev && deltaPrev > 50;
            const widthPct = typeof deltaPrev === 'number' && !isOutOrderPrev ? Math.min(100, (deltaPrev / maxDelta) * 100) : 0;

            return (
              <tr key={i} className="hover:bg-dark-hover text-text-sub">
                <td className="py-2.5 px-3 text-text-muted font-sans">{i + 1}</td>
                <td className="py-2.5 px-3 text-text-sub font-mono">{formatTime(ev.timestamp)}</td>
                <td className="py-2.5 px-3 text-uguisu-light font-bold font-sans">{ev.event}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-dark-base rounded-full overflow-hidden shrink-0 border border-dark-border">
                      {typeof deltaPrev === 'number' && !isOutOrderPrev && (
                        <div className={`h-full ${isHighDelta ? 'bg-gold-warning-light' : 'bg-uguisu-light/60'}`} style={{ width: `${widthPct}%` }} />
                      )}
                    </div>
                    <span className={`text-[12px] font-mono w-16 truncate ${isOutOrderPrev ? 'text-enji-light/80 italic font-sans' : isHighDelta ? 'text-gold-warning-light font-bold' : 'text-text-sub'}`} title={isOutOrderPrev ? 'Logical order differs from timestamp order' : ''}>
                      {displayDeltaPrev}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  <span className={`${isPreStart ? 'text-enji-light/80 italic text-[11px] font-sans' : 'text-text-main'}`} title={isPreStart ? 'Occurred before start timestamp' : ''}>
                    {displayDeltaStart}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function CommandForensics({ chains, retcodeSummary, pollingSummary, events }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('Trade');

  const safeChains = chains || [];

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredChains = safeChains.filter(c => {
    if (filterType === 'All') return true;
    return c.type === filterType;
  });

  return (
    <div className="flex-1 flex flex-col p-5 pt-0 bg-dark-base shrink-0">
      <CommandSummaryCards chains={safeChains} />

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <PollingSummaryPanel summary={pollingSummary} />
      </div>

      <VisualDiagnostics chains={safeChains} retcodeSummary={retcodeSummary} events={events} />

      <div className="flex-1 flex flex-col overflow-hidden bg-dark-card border border-dark-border rounded-[3px] shadow-sm">
        <div className="p-3.5 px-4 border-b border-dark-border bg-dark-card flex flex-wrap items-center gap-4 shrink-0 text-xs">
          <div className="flex flex-col">
            <span className="font-sans font-bold text-text-main uppercase tracking-wider text-[15px]">Command Summary</span>
            <span className="text-text-sub text-[12px] font-sans">Per-command correlation forensics</span>
          </div>
          
          <div className="w-px h-6 bg-dark-border/40 mx-2"></div>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-text-sub focus:border-uguisu-light/50 outline-none text-[12px] uppercase tracking-wider font-semibold font-sans"
          >
            <option value="Trade">Trade Commands</option>
            <option value="Polling">Polling / Status</option>
            <option value="All">All Chains</option>
          </select>

          <div className="flex-1"></div>
          <div className="text-text-sub font-sans text-[13px]">
            Showing <span className="font-mono font-bold text-text-main">{filteredChains.length}</span> chains
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-dark-base min-h-[300px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-dark-thead z-10 text-[12px] font-sans font-bold uppercase tracking-wider text-text-sub border-b border-dark-border shadow-sm">
              <tr>
                <th className="py-3.5 px-3.5 font-semibold">Time</th>
                <th className="py-3.5 px-3.5 font-semibold">Action</th>
                <th className="py-3.5 px-3.5 font-semibold">Result</th>
                <th className="py-3.5 px-3.5 font-semibold">Correlation ID</th>
                <th className="py-3.5 px-3.5 font-semibold text-right">Total Obs</th>
                <th className="py-3.5 px-3.5 font-semibold text-right">Core Exec</th>
                <th className="py-3.5 px-3.5 font-semibold text-right text-uguisu-light">MT5 Exec</th>
                <th className="py-3.5 px-3.5 font-semibold text-right">Post/UI</th>
                <th className="py-3.5 px-3.5 font-semibold">Retcode</th>
                <th className="py-3.5 px-3.5 font-semibold text-gold-warning-light">Dominant Layer</th>
                <th className="py-3.5 px-3.5 font-semibold text-center w-12">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40 text-[13px] font-sans">
              {filteredChains.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-text-muted font-sans">No chains found for the selected filter.</td>
                </tr>
              ) : filteredChains.map((chain) => {
                const isExpanded = expandedId === chain.id;
                const isSuccess = chain.retcode === 10009 || chain.retcode === 0;
                const isError = chain.retcode !== 'n/a' && !isSuccess;
                
                return (
                  <React.Fragment key={chain.id}>
                    <tr 
                      className={`hover:bg-dark-hover transition-colors duration-75 cursor-pointer ${isExpanded ? 'bg-dark-surface animate-none' : ''}`}
                      onClick={() => toggleRow(chain.id)}
                    >
                      <td className="py-3 px-3.5 text-text-sub font-mono">{formatTime(chain.startTime)}</td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-1 rounded border font-sans text-[12px] font-bold ${
                          chain.isCloseAll 
                            ? 'bg-dark-surface border border-uguisu/40 text-uguisu-light' 
                            : chain.isClosePosition 
                              ? 'bg-dark-surface border border-uguisu-hover/40 text-uguisu-light' 
                              : 'bg-dark-base border border-dark-border text-text-sub'
                        }`}>
                          {chain.action}
                        </span>
                        {chain.isCloseAll && <span className="ml-2 text-[11px] font-sans text-text-muted" title="Position-count dependent">pos-dep</span>}
                      </td>
                      <td className="py-3 px-3.5 font-sans">
                        {chain.result !== 'n/a' && (
                          <span className={`flex items-center gap-1.5 ${isSuccess ? 'text-uguisu-light' : isError ? 'text-enji-light' : 'text-text-sub'}`}>
                            {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : isError ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                            <span className="truncate max-w-[120px]" title={chain.result}>{chain.result}</span>
                          </span>
                        )}
                        {chain.result === 'n/a' && <span className="text-text-muted">-</span>}
                      </td>
                      <td className="py-3 px-3.5 text-text-muted font-mono truncate max-w-[120px]" title={chain.id}>{chain.id}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-text-main">{chain.latencies.totalObserved}</td>
                      <td className="py-3 px-3.5 text-right font-mono text-text-sub">{chain.latencies.coreExecution}</td>
                      <td className="py-3 px-3.5 text-right font-mono text-uguisu-light font-bold">{chain.latencies.mt5Execution}</td>
                      <td className="py-3 px-3.5 text-right font-mono text-text-sub">{chain.latencies.postExecution}</td>
                      <td className="py-3 px-3.5">
                        <span className={`text-[13px] font-mono font-bold ${isSuccess ? 'text-uguisu-light' : isError ? 'text-enji-light' : 'text-text-muted'}`}>{chain.retcode}</span>
                      </td>
                      <td className="py-3 px-3.5 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${chain.dominantLayer.includes('Insufficient') ? 'text-text-muted' : 'bg-gold-warning-bg text-gold-warning-light border border-gold-warning-border/60'}`}>
                          {chain.dominantLayer}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button className={`p-1 rounded transition-colors ${isExpanded ? 'text-uguisu-light' : 'text-text-muted'}`}>
                          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-dark-card">
                        <td colSpan={11} className="p-0">
                          <CommandStepList events={chain.events} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
