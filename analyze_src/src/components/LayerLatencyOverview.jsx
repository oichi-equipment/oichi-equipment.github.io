import React from 'react';

const EMPTY_STATS = { median: 'n/a', p95: 'n/a', max: 'n/a', count: '-' };

export default function LayerLatencyOverview({ stats }) {
  const safeStats = stats || {
    mt5Execution: EMPTY_STATS,
    wsTransport: EMPTY_STATS,
    render: EMPTY_STATS,
    statusBuild: EMPTY_STATS
  };

  const items = [
    { label: 'MT5 Execution', data: safeStats.mt5Execution },
    { label: 'WebSocket Transport', data: safeStats.wsTransport },
    { label: 'UI Render', data: safeStats.render },
    { label: 'Status Build', data: safeStats.statusBuild }
  ];

  // Find the absolute maximum p95 across all layers to scale the bars
  const maxP95 = Math.max(
    ...items.map(item => item.data.p95 !== 'n/a' ? item.data.p95 : 0)
  );
  
  // Safe denominator
  const scale = maxP95 > 0 ? maxP95 : 1;

  return (
    <div className="flex-[2] bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-5 flex flex-col shadow-sm">
      <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-[rgba(148,163,184,0.15)] pb-3 flex items-center justify-between">
        <span>Layer Latency Overview</span>
        <span className="text-[9px] text-slate-500 normal-case tracking-normal font-mono">Scaled to max p95</span>
      </h3>
      
      <div className="flex flex-col gap-4 flex-1 justify-center py-2">
        {items.map((item, idx) => {
          const val = item.data.p95 !== 'n/a' ? item.data.p95 : 0;
          const pct = Math.min(100, Math.max(1, (val / scale) * 100)); // Min 1% to show something if non-zero
          const isNA = item.data.p95 === 'n/a';

          return (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-semibold">{item.label}</span>
                <span className="text-slate-500">
                  {isNA ? 'n/a' : <><span className="text-cyan-400 font-bold">{val}</span> ms</>}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* CSS Bar Container */}
                <div className="flex-1 h-2 bg-[#0b1117] rounded-full overflow-hidden border border-[rgba(148,163,184,0.1)]">
                  {!isNA && (
                    <div 
                      className="h-full bg-cyan-500/80 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono w-[140px] justify-end">
                  <span title="Median">M: {isNA ? '-' : item.data.median}</span>
                  <span title="Max" className="text-slate-600">X: {isNA ? '-' : item.data.max}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
