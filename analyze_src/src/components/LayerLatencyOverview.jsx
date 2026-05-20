import { Cpu } from 'lucide-react';

export default function LayerLatencyOverview({ stats }) {
  const isLoaded = stats;

  const layers = [
    {
      key: 'wsTransport',
      name: 'WS Transport Latency',
      desc: 'Local browser ⇆ MT5 local WebSocket gateway loop'
    },
    {
      key: 'mt5Execution',
      name: 'MT5 Execution Latency',
      desc: 'MT5 Terminal core transaction execution'
    },
    {
      key: 'render',
      name: 'UI Render Latency',
      desc: 'Local browser state updates and UI paint time'
    },
    {
      key: 'statusBuild',
      name: 'Status Build Latency',
      desc: 'Server-side data aggregation and structure compiling'
    }
  ];

  // Helper to find percentage of median out of 1000ms ceiling for bar rendering
  const getPercent = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return 0;
    return Math.min(100, Math.round((val / 600) * 100));
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col h-full shadow-sm select-none">
      {/* Header title */}
      <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3.5 border-b border-dark-border pb-2 flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-uguisu-light" />
        Layer Latency Breakdowns
      </h4>

      {/* Layer Metrics List */}
      <div className="flex-1 flex flex-col gap-3 justify-center">
        {layers.map((layer) => {
          const lStats = isLoaded ? stats[layer.key] : null;
          const median = lStats && lStats.median !== 'n/a' ? lStats.median : 'n/a';
          const max = lStats && lStats.max !== 'n/a' ? lStats.max : 'n/a';
          const pct = getPercent(median);

          return (
            <div key={layer.key} className="flex flex-col gap-1">
              {/* Layer Title and Median Value */}
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-sans font-semibold text-text-sub truncate max-w-[200px]" title={layer.name}>
                  {layer.name}
                </span>
                <span className="text-[13px] font-sans font-bold text-text-main leading-none">
                  {median !== 'n/a' ? <span className="font-mono">{median}ms</span> : <span className="text-text-muted">n/a</span>}
                </span>
              </div>

              {/* Range subtext */}
              <div className="flex justify-between items-center text-[12px] text-text-muted font-mono">
                <span className="truncate max-w-[170px] text-[11px] font-sans font-normal">{layer.desc}</span>
                <span>Max: {max !== 'n/a' ? `${max}ms` : 'n/a'}</span>
              </div>

              {/* Progress Gauge */}
              <div className="h-2 bg-dark-base rounded-full overflow-hidden w-full border border-dark-border mt-0.5">
                <div
                  className="h-full rounded-full bg-uguisu transition-all duration-500 ease-out"
                  style={{
                    width: `${median !== 'n/a' ? Math.max(pct, 4) : 0}%`,
                    opacity: 0.85
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
