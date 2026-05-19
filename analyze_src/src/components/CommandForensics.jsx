import React, { useState } from 'react';
import { ShieldCheck, Activity, Maximize2, Minimize2, CheckCircle2, AlertTriangle, XCircle, Info, FileJson } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

const RetcodeSummary = ({ summary }) => {
  if (!summary || summary.length === 0) return null;

  return (
    <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[300px]">
      <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-[rgba(148,163,184,0.15)] pb-2 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
        MT5 Retcode Summary
      </h3>
      <div className="flex flex-col gap-2">
        {summary.map((item, idx) => {
          const isSuccess = item.retcode === 10009 || item.retcode === 0;
          const isReject = item.retcode === 10006 || item.retcode === 10015 || item.retcode === 10016;
          
          return (
            <div key={idx} className={`flex items-center gap-3 px-3 py-1.5 border rounded-[3px] ${isSuccess ? 'border-emerald-500/30 bg-emerald-500/5' : isReject ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex flex-col flex-1">
                <span className={`text-base font-bold font-mono leading-none ${isSuccess ? 'text-emerald-400' : isReject ? 'text-amber-400' : 'text-red-400'}`}>
                  {item.retcode}
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mt-1">{item.comment}</span>
              </div>
              <div className="text-xl font-mono text-slate-200 border-l border-[rgba(148,163,184,0.15)] pl-3">
                {item.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PollingSummaryPanel = ({ summary }) => {
  if (!summary || summary.chainCount === 0) return null;

  return (
    <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-4 flex flex-col shadow-sm flex-1 min-w-[250px]">
      <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-[rgba(148,163,184,0.15)] pb-2 flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-500/80" />
        Polling & Status Activity
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px]">
        <div className="flex justify-between items-center text-slate-400">
          <span>Polling Chains</span><span className="text-slate-200 font-bold">{summary.chainCount}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Avg Duration</span><span className="text-slate-200 font-bold">{summary.avgDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Refresh</span><span className="text-cyan-400 font-bold">{summary.refreshCount}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Max Duration</span><span className="text-slate-200">{summary.maxDuration} ms</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Override</span><span className="text-amber-400 font-bold">{summary.overrideCount}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Skipped</span><span className="text-slate-500">{summary.skippedCount}</span>
        </div>
      </div>
    </div>
  );
};

const CommandSummaryCards = ({ chains }) => {
  const tradeChains = chains.filter(c => c.type === 'Trade');
  const pollingChains = chains.filter(c => c.type === 'Polling');
  
  const executed = tradeChains.length;
  const failed = tradeChains.filter(c => c.retcode !== 'n/a' && c.retcode !== 10009 && c.retcode !== 0).length;
  
  // Calculate MT5 latencies
  const mt5Lats = tradeChains.filter(c => typeof c.latencies.mt5Execution === 'number').map(c => c.latencies.mt5Execution).sort((a,b)=>a-b);
  const medianMt5 = mt5Lats.length > 0 ? mt5Lats[Math.floor(mt5Lats.length/2)] : 'n/a';
  const p95Mt5 = mt5Lats.length > 0 ? mt5Lats[Math.floor(mt5Lats.length * 0.95)] : 'n/a';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-3 shadow-sm flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Executed Trades</span>
        <span className="text-xl font-mono font-bold text-slate-100">{executed}</span>
      </div>
      <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-3 shadow-sm flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Failed Trades</span>
        <span className={`text-xl font-mono font-bold ${failed > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{failed}</span>
      </div>
      <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-3 shadow-sm flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Polling Chains</span>
        <span className="text-xl font-mono font-bold text-slate-500">{pollingChains.length}</span>
      </div>
      <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-3 shadow-sm flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">MT5 Median (Trade)</span>
        <span className="text-xl font-mono font-bold text-cyan-400">{medianMt5} <span className="text-[10px] text-slate-500">ms</span></span>
      </div>
      <div className="bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-3 shadow-sm flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">MT5 p95 (Trade)</span>
        <span className="text-xl font-mono font-bold text-cyan-500">{p95Mt5} <span className="text-[10px] text-slate-500">ms</span></span>
      </div>
    </div>
  );
};

const CommandStepList = ({ events }) => {
  const startTs = new Date(events[0].timestamp).getTime();
  
  return (
    <div className="p-4 border-l-2 border-cyan-500/50 overflow-x-auto shadow-inner bg-black/20">
      <div className="flex items-center gap-2 mb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        <Activity className="w-3.5 h-3.5 text-cyan-500/80" /> Command Execution Steps
      </div>
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-[rgba(148,163,184,0.1)]">
          <tr>
            <th className="pb-2 px-3 font-normal">Step</th>
            <th className="pb-2 px-3 font-normal">Time</th>
            <th className="pb-2 px-3 font-normal">Event</th>
            <th className="pb-2 px-3 font-normal text-right">Δ Prev (ms)</th>
            <th className="pb-2 px-3 font-normal text-right">Δ Start (ms)</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[11px] divide-y divide-[rgba(148,163,184,0.05)]">
          {events.map((ev, i) => {
            const currentTs = new Date(ev.timestamp).getTime();
            const prevTs = i > 0 ? new Date(events[i-1].timestamp).getTime() : currentTs;
            
            const deltaPrev = isNaN(currentTs) || isNaN(prevTs) ? '-' : (currentTs - prevTs);
            const deltaStart = isNaN(currentTs) || isNaN(startTs) ? '-' : (currentTs - startTs);
            
            const isHighDelta = typeof deltaPrev === 'number' && deltaPrev > 50;

            return (
              <tr key={i} className="hover:bg-[rgba(148,163,184,0.05)] text-slate-300">
                <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                <td className="py-1.5 px-3 text-slate-400">{formatTime(ev.timestamp)}</td>
                <td className="py-1.5 px-3 text-cyan-400/80 font-semibold">{ev.event}</td>
                <td className={`py-1.5 px-3 text-right ${isHighDelta ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  {deltaPrev}
                </td>
                <td className="py-1.5 px-3 text-right text-slate-200">{deltaStart}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function CommandForensics({ chains, retcodeSummary, pollingSummary }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('Trade');

  if (!chains || chains.length === 0) return null;

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredChains = chains.filter(c => {
    if (filterType === 'All') return true;
    return c.type === filterType;
  });

  return (
    <div className="flex-1 flex flex-col p-5 pt-0 bg-[#0b1117] shrink-0">
      <CommandSummaryCards chains={chains} />

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <RetcodeSummary summary={retcodeSummary} />
        <PollingSummaryPanel summary={pollingSummary} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] shadow-sm">
        <div className="p-3 px-4 border-b border-[rgba(148,163,184,0.15)] bg-[#141f2a] flex flex-wrap items-center gap-4 shrink-0 text-xs">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-100 uppercase tracking-widest">Command Summary</span>
            <span className="text-slate-400 text-[10px]">Per-command correlation forensics</span>
          </div>
          
          <div className="w-px h-6 bg-[rgba(148,163,184,0.15)] mx-2"></div>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            className="bg-[#0b1117] border border-[rgba(148,163,184,0.2)] rounded px-2 py-1 text-slate-200 focus:border-cyan-500/50 outline-none text-[10px] uppercase tracking-widest font-semibold"
          >
            <option value="Trade">Trade Commands</option>
            <option value="Polling">Polling / Status</option>
            <option value="All">All Chains</option>
          </select>

          <div className="flex-1"></div>
          <div className="text-slate-400 font-mono">Showing {filteredChains.length} chains</div>
        </div>

        <div className="flex-1 overflow-auto bg-[#0b1117] min-h-[300px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-[#141f2a] z-10 text-[10px] uppercase tracking-widest text-slate-400 border-b border-[rgba(148,163,184,0.15)] font-semibold shadow-sm">
              <tr>
                <th className="py-2.5 px-4 font-normal">Time</th>
                <th className="py-2.5 px-4 font-normal">Action</th>
                <th className="py-2.5 px-4 font-normal">Correlation ID</th>
                <th className="py-2.5 px-4 font-normal">Result</th>
                <th className="py-2.5 px-4 font-normal text-right">Total (ms)</th>
                <th className="py-2.5 px-4 font-normal text-right text-cyan-500/80">MT5 Exec</th>
                <th className="py-2.5 px-4 font-normal text-right text-cyan-500/80">Status</th>
                <th className="py-2.5 px-4 font-normal text-right text-cyan-500/80">WS</th>
                <th className="py-2.5 px-4 font-normal text-right text-cyan-500/80">Render</th>
                <th className="py-2.5 px-4 font-normal text-amber-500/80">Dominant Layer</th>
                <th className="py-2.5 px-4 font-normal text-center w-16">Details</th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-[rgba(148,163,184,0.1)] text-[11px]">
              {filteredChains.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">No chains found for the selected filter.</td>
                </tr>
              ) : filteredChains.map((chain) => {
                const isExpanded = expandedId === chain.id;
                const isSuccess = chain.retcode === 10009 || chain.retcode === 0;
                const isError = chain.retcode !== 'n/a' && !isSuccess;
                
                return (
                  <React.Fragment key={chain.id}>
                    <tr 
                      className={`hover:bg-[rgba(148,163,184,0.05)] transition-colors duration-75 cursor-pointer ${isExpanded ? 'bg-cyan-900/10' : ''}`}
                      onClick={() => toggleRow(chain.id)}
                    >
                      <td className="py-2 px-4 text-slate-400">{formatTime(chain.startTime)}</td>
                      <td className="py-2 px-4">
                        <span className={`px-1.5 py-0.5 rounded border ${chain.isCloseAll ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-200'}`}>
                          {chain.action}
                        </span>
                        {chain.isCloseAll && <span className="ml-2 text-[9px] text-slate-500" title="Position-count dependent">pos-dep</span>}
                      </td>
                      <td className="py-2 px-4 text-slate-500 truncate max-w-[120px]" title={chain.id}>{chain.id}</td>
                      <td className="py-2 px-4">
                        {chain.result !== 'n/a' && (
                          <span className={`flex items-center gap-1.5 ${isSuccess ? 'text-emerald-400' : isError ? 'text-amber-400' : 'text-slate-400'}`}>
                            {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                            <span className="truncate max-w-[150px]" title={chain.result}>{chain.result}</span>
                          </span>
                        )}
                        {chain.result === 'n/a' && <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-200">{chain.latencies.total}</td>
                      <td className="py-2 px-4 text-right text-slate-400">{chain.latencies.mt5Execution}</td>
                      <td className="py-2 px-4 text-right text-slate-400">{chain.latencies.statusBuild}</td>
                      <td className="py-2 px-4 text-right text-slate-400">{chain.latencies.wsTransport}</td>
                      <td className="py-2 px-4 text-right text-slate-400">{chain.latencies.uiRender}</td>
                      <td className="py-2 px-4">
                        <span className={`px-1.5 py-0.5 rounded ${chain.dominantLayer.includes('Insufficient') ? 'text-slate-600' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {chain.dominantLayer}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button className={`p-1 rounded transition-colors ${isExpanded ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#111922]">
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
