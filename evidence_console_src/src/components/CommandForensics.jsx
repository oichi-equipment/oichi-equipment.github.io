import React, { useState, useEffect } from 'react';
import { Activity, Maximize2, Minimize2, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

const getDominantLayerColor = (layer) => {
  const l = (layer || '').toLowerCase();
  if (l.includes('mt5')) return 'bg-transparent shadow-none text-[#d4af37] border border-[#d4af37]/40';
  if (l.includes('local') || l.includes('mushroom')) return 'bg-transparent shadow-none text-[#7f944d] border border-[#7f944d]/40';
  if (l.includes('post ui') || l.includes('reflection')) return 'bg-transparent shadow-none text-[#d08c38] border border-[#d08c38]/40';
  if (l.includes('ui render')) return 'bg-transparent shadow-none text-[#8b949e] border border-[#8b949e]/40';
  if (l.includes('ws transport')) return 'bg-transparent shadow-none text-[#78a5a3] border border-[#78a5a3]/40';
  if (l.includes('status build')) return 'bg-transparent shadow-none text-[#a1a1aa] border border-[#3f3f46]';
  return 'bg-transparent shadow-none text-[#a1a1aa] border border-[#2d2d2d]';
};

const formatLayerDisplayName = (layer) => {
  if (!layer) return layer;
  const mapping = {
    'Synk Mushroom Local': 'Local Event Chain',
    'MT5 Execution': 'Broker / MT5 Response',
    'MT5 / Broker': 'Broker / MT5 Response',
    'Post UI Reflection': 'Post-UI Reflection',
    'WebSocket Transport': 'WebSocket Transport',
    'Status Build': 'Status Build',
    'UI Render': 'UI Render'
  };
  return mapping[layer] || layer;
};

const PollingSummaryPanel = ({ summary }) => {
  if (!summary || summary.chainCount === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[250px]">
        <h3 className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-[#2d2d2d] pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-uguisu-light/80" />
          Polling & Status Activity
        </h3>
        <div className="flex items-center justify-center flex-1 min-h-[80px] text-[#a1a1aa] text-[13px] font-sans">
          Waiting for JSONL
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[250px]">
      <h3 className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-[#2d2d2d] pb-2 flex items-center gap-2">
        <Activity className="w-4 h-4 text-uguisu-light/80" />
        Polling & Status Activity
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-sans text-[13px]">
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Polling Chains</span><span className="text-[#f3f4f6] font-mono font-bold">{summary.chainCount}</span>
        </div>
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Avg Duration</span><span className="text-[#f3f4f6] font-mono font-bold">{summary.avgDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Refresh</span><span className="text-uguisu-light font-mono font-bold">{summary.refreshCount}</span>
        </div>
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Max Duration</span><span className="text-[#f3f4f6] font-mono font-bold">{summary.maxDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Override</span><span className="text-gold-warning font-mono font-bold">{summary.overrideCount}</span>
        </div>
        <div className="flex justify-between items-center text-[#d4d4d8]">
          <span>Skipped</span><span className="text-[#a1a1aa] font-mono font-bold">{summary.skippedCount}</span>
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
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">Executed / Failed</span>
        <span className="text-[20px] font-mono font-bold text-[#f3f4f6] mt-1">{executed} <span className="text-[#a1a1aa]">/</span> <span className={`${failed > 0 ? 'text-[#cc4444] animate-pulse' : 'text-[#f3f4f6]'}`}>{failed}</span></span>
      </div>
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">Most Common</span>
        <span className="text-[14px] font-sans font-bold text-[#f3f4f6] mt-1">{mostCommon}</span>
      </div>
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">Total Obs (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-[#d4d4d8] mt-1">{totalStats.median} <span className="text-[13px] text-[#a1a1aa]">/ {totalStats.p95}</span></span>
      </div>
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">Core Exec (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-[#d4d4d8] mt-1">{coreStats.median} <span className="text-[13px] text-[#a1a1aa]">/ {coreStats.p95}</span></span>
      </div>
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">MT5 Exec (M / p95)</span>
        <span className="text-[20px] font-mono font-bold text-[#f3f4f6] mt-1">{mt5Stats.median} <span className="text-[13px] text-[#a1a1aa]">/ {mt5Stats.p95}</span></span>
      </div>
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 shadow-sm flex flex-col justify-between">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider">Slowest Cmd</span>
        <span className="text-[15px] font-sans font-bold text-[#d4af37] mt-1 whitespace-nowrap" title={slowest}>{slowest}</span>
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
        <div className="flex items-center gap-2 text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider">
          <Activity className="w-4 h-4 text-[#8a9f5c]/80" /> Command Execution Steps
        </div>
        <div className="text-[12px] font-sans text-[#71717a] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 opacity-70" />
          Steps are displayed in logical command order. Out-of-order timestamps are marked instead of shown as negative latency.
        </div>
      </div>
      <table className="w-full text-left border-collapse whitespace-nowrap table-fixed">
        <thead className="bg-[#111111] sticky top-0 z-10 text-[11px] font-sans font-bold uppercase tracking-wider text-[#a1a1aa] border-b border-[#2d2d2d] shadow-sm">
          <tr>
            <th className="pb-2 px-3 font-semibold w-12">#</th>
            <th className="pb-2 px-3 font-semibold">Time</th>
            <th className="pb-2 px-3 font-semibold">Event</th>
            <th className="pb-2 px-3 font-semibold">Δ Timeline</th>
            <th className="pb-2 px-3 font-semibold text-right">Δ Start (ms)</th>
          </tr>
        </thead>
        <tbody className="text-[13px] divide-y divide-[#2d2d2d]/20">
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
              <tr key={i} className="hover:bg-[#181818] text-[#d4d4d8]">
                <td className="py-2.5 px-3 text-[#a1a1aa] font-sans">{i + 1}</td>
                <td className="py-2.5 px-3 text-[#d4d4d8] font-mono">{formatTime(ev.timestamp)}</td>
                <td className="py-2.5 px-3 text-[#f3f4f6] font-bold font-sans">{ev.event}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-[#111111] rounded-full overflow-hidden shrink-0 border border-[#2d2d2d]">
                      {typeof deltaPrev === 'number' && !isOutOrderPrev && (
                        <div className={`h-full ${isHighDelta ? 'bg-[#d4af37]' : 'bg-[#52662c]'}`} style={{ width: `${widthPct}%` }} />
                      )}
                    </div>
                    <span className={`text-[12px] font-mono w-16 truncate ${isOutOrderPrev ? 'text-[#d4af37] italic font-sans' : isHighDelta ? 'text-[#d4af37] font-bold' : 'text-[#d4d4d8]'}`} title={isOutOrderPrev ? 'Logical order differs from timestamp order' : ''}>
                      {displayDeltaPrev}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  <span className={`${isPreStart ? 'text-[#a1a1aa] italic text-[11px] font-sans' : 'text-[#f3f4f6]'}`} title={isPreStart ? 'Occurred before start timestamp' : ''}>
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

  const INITIAL_ROWS = 10;
  const PAGE_ROWS = 100;
  const [viewMode, setViewMode] = useState('preview');
  const [pageIndex, setPageIndex] = useState(0);

  const filteredLength = filteredChains.length;
  useEffect(() => {
    setViewMode('preview');
    setPageIndex(0);
  }, [filterType, filteredLength]);

  const totalRows = filteredLength;
  const totalPages = Math.ceil(totalRows / PAGE_ROWS);

  let start = 0;
  let end = 0;

  if (viewMode === 'preview') {
    start = 0;
    end = Math.min(INITIAL_ROWS, totalRows);
  } else {
    start = pageIndex * PAGE_ROWS;
    end = Math.min(start + PAGE_ROWS, totalRows);
  }

  const displayChains = filteredChains.slice(start, end);

  const anchorRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);

  const handleShowMore = () => {
    setViewMode('paged');
    setPageIndex(0);
  };

  const handleShowLess = () => {
    setViewMode('preview');
    setPageIndex(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollLeft = 0;
        }
        anchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  };

  const handleNext = () => {
    if (pageIndex < totalPages - 1) {
      setPageIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      setPageIndex(prev => prev - 1);
    }
  };

  const showShowMore = viewMode === 'preview' && totalRows > INITIAL_ROWS;
  const showShowLess = viewMode === 'paged';
  const showPrev = viewMode === 'paged';
  const showNext = viewMode === 'paged';

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  return (
    <div className="flex-1 flex flex-col p-5 pt-0 bg-dark-base shrink-0">
      <CommandSummaryCards chains={safeChains} />

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <PollingSummaryPanel summary={pollingSummary} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#111111] border border-[#2d2d2d] rounded-[3px] shadow-sm">
        <div className="p-3.5 px-4 border-b border-[#2d2d2d] bg-[#161616] flex flex-wrap items-center gap-4 shrink-0 text-xs relative scroll-mt-24" ref={anchorRef}>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-white uppercase tracking-wider text-[15px]">Command Summary</span>
            <span className="text-[#f3f4f6] text-[12px] font-sans">Per-command correlation forensics</span>
          </div>
          
          <div className="w-px h-6 bg-dark-border/40 mx-2"></div>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            className="bg-[#111111] border border-[#2d2d2d] rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase tracking-wider font-semibold font-sans"
          >
            <option value="Trade">Trade Commands</option>
            <option value="Polling">Polling / Status</option>
            <option value="All">All Chains</option>
          </select>

          <div className="flex-1"></div>

          {viewMode === 'paged' && (
            <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!canPrev}
                className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev 100
              </button>
              <button
                onClick={handleShowLess}
                className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next 100 →
              </button>
            </div>
          )}

          <div className="text-[#d4d4d8] font-sans text-[13px]">
            Showing <span className="font-mono font-bold text-[#f3f4f6]">{filteredChains.length}</span> chains
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-dark-base min-h-[300px]" ref={scrollContainerRef}>
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-[#0b0b0b] z-10 text-[11px] font-sans font-bold uppercase tracking-wider text-[#d4d4d8] border-b border-[#2d2d2d] shadow-sm">
              <tr>
                <th className="py-3 px-3.5 font-semibold">Time</th>
                <th className="py-3 px-3.5 font-semibold">Action</th>
                <th className="py-3 px-3.5 font-semibold">Result</th>
                <th className="py-3 px-3.5 font-semibold">Correlation ID</th>
                <th className="py-3 px-3.5 font-semibold text-right">Total Obs</th>
                <th className="py-3 px-3.5 font-semibold text-right">Core Exec</th>
                <th className="py-3 px-3.5 font-semibold text-right">MT5 Exec</th>
                <th className="py-3 px-3.5 font-semibold text-right">Post/UI</th>
                <th className="py-3 px-3.5 font-semibold">Retcode</th>
                <th className="py-3 px-3.5 font-semibold" title="Where observed time is concentrated. Not fault assignment.">Observed Latency Area</th>
                <th className="py-3 px-3.5 font-semibold text-center w-12">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] text-[13px] font-sans">
              {displayChains.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-[#a1a1aa] font-sans italic">No chains found for the selected filter.</td>
                </tr>
              ) : displayChains.map((chain) => {
                const isExpanded = expandedId === chain.id;
                const isSuccess = chain.retcode === 10009 || chain.retcode === 0;
                const isError = chain.retcode !== 'n/a' && !isSuccess;
                
                return (
                  <React.Fragment key={chain.id}>
                    <tr 
                      className={`hover:bg-[#181818] transition-colors duration-75 cursor-pointer ${isExpanded ? 'bg-[#181818] animate-none' : ''}`}
                      onClick={() => toggleRow(chain.id)}
                    >
                      <td className="py-4 px-3.5 text-[#f3f4f6] font-mono">{formatTime(chain.startTime)}</td>
                      <td className="py-4 px-3.5">
                        <span className={`px-2 py-1 rounded-[3px] border font-sans text-[11px] font-bold uppercase tracking-wider ${
                          chain.isCloseAll 
                            ? 'bg-[#1a1a1a] border border-[#d4af37]/40 text-[#d4af37]' 
                            : 'bg-[#111111] border border-[#2d2d2d] text-white'
                        }`}>
                          {chain.action}
                        </span>
                        {chain.isCloseAll && <span className="ml-2 text-[10px] font-sans text-[#a1a1aa]" title="Position-count dependent">pos-dep</span>}
                      </td>
                      <td className="py-4 px-3.5 font-sans">
                        {chain.result !== 'n/a' && (
                          <span className={`flex items-center gap-1.5 ${isSuccess ? 'text-white' : isError ? 'text-[#cc4444]' : 'text-[#f3f4f6]'}`}>
                            {isSuccess ? <CheckCircle2 className="w-4 h-4 text-[#a1a1aa]" /> : isError ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                            <span className="truncate max-w-[120px]" title={chain.result}>{chain.result}</span>
                          </span>
                        )}
                        {chain.result === 'n/a' && <span className="text-[#a1a1aa]">-</span>}
                      </td>
                      <td className="py-4 px-3.5 text-[#a1a1aa] font-mono truncate max-w-[120px]" title={chain.id}>{chain.id}</td>
                      <td className="py-4 px-3.5 text-right font-mono font-bold text-white text-[14px]">{chain.latencies.totalObserved}</td>
                      <td className="py-4 px-3.5 text-right font-mono text-[#a1a1aa] text-[13px]">{chain.latencies.coreExecution}</td>
                      <td className="py-4 px-3.5 text-right font-mono text-uguisu-light font-bold text-[14px]">{chain.latencies.mt5Execution}</td>
                      <td className="py-4 px-3.5 text-right font-mono text-[#a1a1aa] text-[13px]">{chain.latencies.postExecution}</td>
                      <td className="py-4 px-3.5">
                        <span className={`text-[13px] font-mono font-bold ${isSuccess ? 'text-white' : isError ? 'text-[#cc4444]' : 'text-[#a1a1aa]'}`}>{chain.retcode}</span>
                      </td>
                      <td className="py-4 px-3.5 font-sans">
                        <span className={`px-2 py-1 rounded-[3px] text-[12px] font-bold tracking-wider whitespace-nowrap ${getDominantLayerColor(chain.dominantLayer)}`}>
                          {formatLayerDisplayName(chain.dominantLayer)}
                        </span>
                      </td>
                      <td className="py-4 px-3.5 text-center">
                        <button className={`p-1 rounded transition-colors ${isExpanded ? 'text-white bg-[#252525]' : 'text-[#a1a1aa] hover:text-white'}`}>
                          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#0b0b0b]">
                        <td colSpan={11} className="p-0 border-t border-[#1f1f1f]">
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

        {(showShowMore || showShowLess) && (
          <div className="py-4 border-t border-[#2d2d2d] bg-[#0b0b0b] flex flex-col items-center gap-2">
            {viewMode === 'paged' && (
              <div className="text-[11px] text-[#71717a] tracking-wide">
                Showing {(start + 1).toLocaleString()}–{Math.min(end, totalRows).toLocaleString()} of {totalRows.toLocaleString()} chains
              </div>
            )}
            <div className="flex justify-center items-center gap-2">
              {viewMode === 'preview' ? (
                <button
                  onClick={handleShowMore}
                  className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show more
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={!canPrev}
                    className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Prev 100
                  </button>
                  <button
                    onClick={handleShowLess}
                    className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canNext}
                    className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next 100 →
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
