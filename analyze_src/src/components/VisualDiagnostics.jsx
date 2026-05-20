import { useState, useMemo } from 'react';
import { Activity, TrendingUp, BarChart3, PieChart } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

const ACTION_COLORS = {
  BUY: '#8ba36b',      // Uguisu-light
  SELL: '#9b3f3f',     // Enji-light
  CLOSE: '#52662c',    // Uguisu
  CLOSE_POSITION: '#52662c',
  CLOSE_ALL: '#52662c',
  MODIFY: '#6b823e',    // Uguisu-hover
  DEFAULT: '#737373'    // Text-muted
};

const getActionColor = (action) => {
  if (!action) return ACTION_COLORS.DEFAULT;
  const upper = action.toUpperCase();
  if (upper.includes('BUY')) return ACTION_COLORS.BUY;
  if (upper.includes('SELL')) return ACTION_COLORS.SELL;
  if (upper.includes('CLOSE_ALL')) return ACTION_COLORS.CLOSE_ALL;
  if (upper.includes('CLOSE')) return ACTION_COLORS.CLOSE;
  if (upper.includes('MODIFY')) return ACTION_COLORS.MODIFY;
  return ACTION_COLORS.DEFAULT;
};

// 1. MT5 Execution Trend Component
const MT5ExecutionTrend = ({ chains }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const dataPoints = useMemo(() => {
    if (!chains) return [];
    return [...chains]
      .filter(c => c.type === 'Trade' && typeof c.latencies.mt5Execution === 'number')
      .reverse();
  }, [chains]);

  const stats = useMemo(() => {
    if (dataPoints.length === 0) return null;
    const lats = dataPoints.map(d => d.latencies.mt5Execution);
    const sorted = [...lats].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
    const max = sorted[sorted.length - 1];
    
    const slowestDp = dataPoints.reduce((maxDp, current) => {
      return (current.latencies.mt5Execution > (maxDp?.latencies.mt5Execution || 0)) ? current : maxDp;
    }, null);

    const spikesCount = lats.filter(l => l > p95 || l > 500).length;

    const segmentSize = Math.max(1, Math.floor(lats.length * 0.3));
    const firstSegment = lats.slice(0, segmentSize);
    const lastSegment = lats.slice(-segmentSize);
    const firstAvg = firstSegment.reduce((a, b) => a + b, 0) / segmentSize;
    const lastAvg = lastSegment.reduce((a, b) => a + b, 0) / segmentSize;
    const trendDiff = lastAvg - firstAvg;
    
    let trend = 'Stable';
    let trendColor = 'text-text-muted';
    if (trendDiff > segmentSize * 5 || trendDiff > 40) {
      trend = 'Increasing';
      trendColor = 'text-gold-warning-light';
    } else if (trendDiff < -40) {
      trend = 'Decreasing';
      trendColor = 'text-uguisu-light';
    }

    return { median, p95, max, slowestDp, spikesCount, trend, trendColor };
  }, [dataPoints]);

  if (dataPoints.length < 2) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[280px]">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-uguisu-light/80" />
          MT5 Execution Trend
        </h4>
        <div className="flex items-center justify-center flex-1 text-text-muted text-[13px] font-sans">
          Not enough data for MT5 Execution Trend
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;

  const maxLat = stats.max;
  const yMax = maxLat * 1.15 || 10;

  const points = dataPoints.map((dp, i) => {
    const x = padLeft + (i / (dataPoints.length - 1)) * (width - padLeft - padRight);
    const y = height - padBottom - (dp.latencies.mt5Execution / yMax) * (height - padTop - padBottom);
    return { x, y, dp, index: i };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${padLeft},${height - padBottom} ${polylinePoints} ${width - padRight},${height - padBottom}`;

  const medY = height - padBottom - (stats.median / yMax) * (height - padTop - padBottom);
  const p95Y = height - padBottom - (stats.p95 / yMax) * (height - padTop - padBottom);

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm relative min-h-[280px]">
      <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3.5 border-b border-dark-border pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-uguisu-light/80" />
          MT5 Execution Trend
        </span>
        <span className="text-[11px] text-text-muted font-sans font-normal normal-case tracking-normal">
          {dataPoints.length} commands plotted
        </span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-stretch">
        <div className="md:col-span-3 relative flex flex-col justify-center min-h-[150px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ba36b" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#8ba36b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
              const val = Math.round(yMax * ratio);
              const y = height - padBottom - ratio * (height - padTop - padBottom);
              return (
                <g key={index}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#2d2d2d"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    fill="#737373"
                    className="text-[9px] font-mono text-right"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            <polygon points={areaPoints} fill="url(#trendGrad)" />

            <polyline
              fill="none"
              stroke="#8ba36b"
              strokeWidth="1.5"
              points={polylinePoints}
            />

            {/* Median Line */}
            {medY >= padTop && medY <= height - padBottom && (
              <g>
                <line
                  x1={padLeft}
                  y1={medY}
                  x2={width - padRight}
                  y2={medY}
                  stroke="#737373"
                  strokeDasharray="2,3"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={padLeft + 4}
                  y={medY - 3}
                  fill="#737373"
                  className="text-[9px] font-mono"
                  opacity="0.8"
                >
                  Med: {stats.median}ms
                </text>
              </g>
            )}

            {/* p95 Line (Warning Gold-Orange) */}
            {p95Y >= padTop && p95Y <= height - padBottom && (
              <g>
                <line
                  x1={padLeft}
                  y1={p95Y}
                  x2={width - padRight}
                  y2={p95Y}
                  stroke="#d0a04a"
                  strokeDasharray="3,3"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <text
                  x={width - padRight - 55}
                  y={p95Y - 3}
                  fill="#d0a04a"
                  className="text-[9px] font-mono font-bold"
                >
                  p95: {stats.p95}ms
                </text>
              </g>
            )}

            {/* Data Points */}
            {points.map((p) => {
              const color = getActionColor(p.dp.action);
              const isHovered = hoveredPoint && hoveredPoint.index === p.index;
              return (
                <circle
                  key={p.index}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={color}
                  stroke="#050505"
                  strokeWidth={isHovered ? 1.5 : 1}
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>

          {/* HTML Absolute Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 bg-dark-card border border-dark-border p-2.5 rounded shadow-xl text-[11px] font-sans text-text-sub w-48 pointer-events-none"
              style={{
                left: `${Math.min(
                  width - 190,
                  Math.max(10, (hoveredPoint.x / width) * 100 - 18)
                )}%`,
                top: `${Math.max(5, (hoveredPoint.y / height) * 100 - 45)}%`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="flex justify-between border-b border-dark-border/40 pb-1 mb-1 font-mono">
                <span className="text-uguisu-light font-bold">Cmd #{hoveredPoint.index + 1}</span>
                <span className="text-text-muted">{formatTime(hoveredPoint.dp.startTime)}</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-text-muted">Action:</span>
                <span
                  className="font-bold font-sans text-[11px]"
                  style={{ color: getActionColor(hoveredPoint.dp.action) }}
                >
                  {hoveredPoint.dp.action}
                </span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-text-muted">MT5 Latency:</span>
                <span className="text-text-main font-bold font-mono">{hoveredPoint.dp.latencies.mt5Execution} ms</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-text-muted">Retcode:</span>
                <span className="text-text-sub font-mono">{hoveredPoint.dp.retcode}</span>
              </div>
              {hoveredPoint.dp.result && hoveredPoint.dp.result !== 'n/a' && (
                <div className="mt-1 text-[10px] text-text-muted border-t border-dark-border/20 pt-1 truncate font-sans" title={hoveredPoint.dp.result}>
                  {hoveredPoint.dp.result}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info Columns */}
        <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-dark-border pt-3 md:pt-0 md:pl-4">
          <div className="flex flex-col bg-dark-surface p-2 border border-dark-border">
            <span className="text-text-muted uppercase tracking-widest text-[9px] font-sans font-bold">Slowest Cmd</span>
            <span className="text-gold-warning-light font-bold font-mono text-[14px] truncate mt-0.5" title={stats.slowestDp ? stats.slowestDp.action : ''}>
              {stats.slowestDp ? `${stats.slowestDp.latencies.mt5Execution}ms` : 'n/a'}
            </span>
            {stats.slowestDp && (
              <span className="text-text-sub text-[10px] mt-0.5 uppercase tracking-wider font-sans truncate">
                ({stats.slowestDp.action})
              </span>
            )}
          </div>

          <div className="flex flex-col bg-dark-surface p-2 border border-dark-border">
            <span className="text-text-muted uppercase tracking-widest text-[9px] font-sans font-bold">Typical Range</span>
            <span className="text-text-main font-bold font-mono text-[14px] mt-0.5">
              {stats.median !== 'n/a' ? `${stats.median} - ${stats.p95} ms` : 'n/a'}
            </span>
            <span className="text-text-muted text-[10px] mt-0.5 font-sans">
              (median to p95)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col bg-dark-surface p-2 border border-dark-border">
              <span className="text-text-muted uppercase tracking-widest text-[9px] font-sans font-bold">Spikes</span>
              <span className="text-gold-warning-light font-bold font-mono text-[13px] mt-0.5">{stats.spikesCount}</span>
            </div>
            <div className="flex flex-col bg-dark-surface p-2 border border-dark-border">
              <span className="text-text-muted uppercase tracking-widest text-[9px] font-sans font-bold">Trend</span>
              <span className={`font-bold font-sans text-[12px] mt-0.5 ${stats.trendColor}`}>{stats.trend}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Command Duration Distribution Component
const CommandDurationDistribution = ({ chains }) => {
  const [metric, setMetric] = useState('totalObserved');
  const [hoveredBin, setHoveredBin] = useState(null);

  const binData = useMemo(() => {
    if (!chains) return null;
    const tradeChains = chains.filter(c => c.type === 'Trade');
    
    const bins = [
      { id: 0, label: '0-250 ms', min: 0, max: 250, total: 0, closeAll: 0 },
      { id: 1, label: '250-500 ms', min: 250, max: 500, total: 0, closeAll: 0 },
      { id: 2, label: '500-1000 ms', min: 500, max: 1000, total: 0, closeAll: 0 },
      { id: 3, label: '1000ms+', min: 1000, max: Infinity, total: 0, closeAll: 0 }
    ];

    let validCount = 0;

    tradeChains.forEach(c => {
      const val = c.latencies[metric];
      if (typeof val !== 'number' || isNaN(val)) return;
      validCount++;
      const isCloseAll = c.action === 'CLOSE_ALL';
      
      const bin = bins.find(b => val >= b.min && val < b.max);
      if (bin) {
        bin.total++;
        if (isCloseAll) {
          bin.closeAll++;
        }
      }
    });

    return { bins, validCount };
  }, [chains, metric]);

  if (!binData || binData.validCount === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[280px]">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-uguisu-light/80" />
          Command Duration Distribution
        </h4>
        <div className="flex items-center justify-center flex-1 text-text-muted text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  const { bins } = binData;
  const maxBinTotal = Math.max(...bins.map(b => b.total), 1);

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[280px] relative">
      <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-4">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-uguisu-light/80" />
          Command Duration Distribution
        </h4>

        <div className="flex bg-dark-base p-1 border border-dark-border rounded-[3px]">
          <button
            onClick={() => setMetric('totalObserved')}
            className={`px-3 py-1 text-[12px] font-sans font-semibold rounded-[2px] transition-all uppercase ${
              metric === 'totalObserved'
                ? 'bg-dark-surface border border-uguisu/40 text-uguisu-light font-bold'
                : 'text-text-sub hover:text-text-main border border-transparent'
            }`}
          >
            Total Obs
          </button>
          <button
            onClick={() => setMetric('mt5Execution')}
            className={`px-3 py-1 text-[12px] font-sans font-semibold rounded-[2px] transition-all uppercase ${
              metric === 'mt5Execution'
                ? 'bg-dark-surface border border-uguisu/40 text-uguisu-light font-bold'
                : 'text-text-sub hover:text-text-main border border-transparent'
            }`}
          >
            MT5 Exec
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end justify-around h-36 px-4 border-b border-dark-border relative">
          {bins.map((bin) => {
            const totalPct = (bin.total / maxBinTotal) * 100;
            const closeAllPct = bin.total > 0 ? (bin.closeAll / bin.total) * 100 : 0;
            const otherPct = 100 - closeAllPct;
            const isHovered = hoveredBin === bin.id;

            return (
              <div
                key={bin.id}
                className="flex flex-col items-center w-16 group cursor-pointer relative"
                onMouseEnter={() => setHoveredBin(bin.id)}
                onMouseLeave={() => setHoveredBin(null)}
              >
                {bin.total > 0 && (
                  <span className="text-[12px] font-mono text-text-sub font-bold mb-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {bin.total}
                  </span>
                )}

                <div
                  className={`w-10 rounded-t-[2px] overflow-hidden flex flex-col justify-end transition-all ${
                    isHovered
                      ? 'shadow-[0_0_12px_rgba(82,102,44,0.08)] border border-uguisu/30 bg-dark-surface'
                      : 'border border-transparent'
                  }`}
                  style={{
                    height: `${Math.max(totalPct, bin.total > 0 ? 5 : 0)}%`,
                    minHeight: bin.total > 0 ? '6px' : '0px'
                  }}
                >
                  {bin.closeAll > 0 && (
                    <div
                      className="bg-uguisu/60 hover:bg-uguisu/80 border-t border-uguisu-light/20 transition-colors"
                      style={{ height: `${closeAllPct}%` }}
                      title={`CLOSE_ALL: ${bin.closeAll}`}
                    />
                  )}

                  {bin.total - bin.closeAll > 0 && (
                    <div
                      className="bg-uguisu-light/30 hover:bg-uguisu-light/45 transition-colors flex-1"
                      style={{ height: `${otherPct}%` }}
                      title={`Others: ${bin.total - bin.closeAll}`}
                    />
                  )}
                </div>

                <span className="text-[12px] font-mono text-text-muted mt-2 text-center whitespace-nowrap">
                  {bin.label}
                </span>

                {isHovered && bin.total > 0 && (
                  <div className="absolute z-20 bottom-full mb-8 bg-dark-card border border-dark-border p-2.5 rounded shadow-xl text-[11px] font-sans text-text-sub w-40 pointer-events-none">
                    <div className="font-bold border-b border-dark-border pb-1 mb-1 text-uguisu-light">
                      {bin.label}
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span>Total:</span>
                      <span className="font-bold text-text-main font-mono">{bin.total}</span>
                    </div>
                    <div className="flex justify-between text-uguisu-light/80 mt-0.5">
                      <span>Standard:</span>
                      <span className="font-mono">{bin.total - bin.closeAll}</span>
                    </div>
                    <div className="flex justify-between text-text-sub mt-0.5">
                      <span>CLOSE_ALL:</span>
                      <span className="font-mono">{bin.closeAll}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-1.5 border-t border-dark-border pt-1.5 italic font-sans">
                      {metric === 'totalObserved' ? 'Total observed' : 'MT5 gateway'} latency
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-3 px-1 text-[12px] font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-text-sub">
              <span className="w-2.5 h-2.5 bg-uguisu-light/30 border border-uguisu-light/50 rounded-[1px]" />
              Other Trades
            </span>
            <span className="flex items-center gap-1.5 text-text-sub">
              <span className="w-2.5 h-2.5 bg-uguisu/60 border border-uguisu-light/20 rounded-[1px]" />
              CLOSE_ALL (pos-dep)
            </span>
          </div>
          <span className="text-text-muted text-[11px] font-sans italic">
            * CLOSE_ALL is position-count dependent
          </span>
        </div>
      </div>
    </div>
  );
};

// 3. Action Breakdown Component
const ActionBreakdown = ({ chains }) => {
  const breakdown = useMemo(() => {
    if (!chains) return [];
    const tradeChains = chains.filter(c => c.type === 'Trade');
    const counts = {};
    
    tradeChains.forEach(c => {
      counts[c.action] = (counts[c.action] || 0) + 1;
    });

    const total = tradeChains.length;
    if (total === 0) return [];

    return Object.entries(counts)
      .map(([action, count]) => ({
        action,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: getActionColor(action)
      }))
      .sort((a, b) => b.count - a.count);
  }, [chains]);

  if (breakdown.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Action Breakdown
        </h4>
        <div className="flex items-center justify-center flex-1 text-text-muted text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
      <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-uguisu-light/80" />
        Action Breakdown
      </h4>

      <div className="flex-1 flex flex-col gap-3 justify-center pr-1 max-h-48 overflow-y-auto">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1 text-[12px] font-sans">
            <div className="flex justify-between items-center text-text-sub">
              <span className="flex items-center gap-2 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.action}
              </span>
              <span className="text-text-sub">
                <span className="font-mono">{item.count}</span> <span className="text-[10px] text-text-muted">/</span> <span className="text-uguisu-light/80 font-mono">{item.percent}%</span>
              </span>
            </div>

            <div className="h-2.5 bg-dark-base rounded-full overflow-hidden w-full border border-dark-border">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: item.color,
                  opacity: 0.8
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Retcode Distribution Component
const RetcodeDistribution = ({ chains, summary }) => {
  const enrichedSummary = useMemo(() => {
    if (!summary || summary.length === 0) return [];
    
    const rcActions = {};
    if (chains) {
      chains.forEach(c => {
        if (c.retcode !== 'n/a' && c.retcode !== undefined) {
          const rc = c.retcode;
          if (!rcActions[rc]) rcActions[rc] = {};
          rcActions[rc][c.action] = (rcActions[rc][c.action] || 0) + 1;
        }
      });
    }

    const getClassification = (rc, comment) => {
      if (rc === 10009) return { status: 'SUCCESS', class: 'text-uguisu-light bg-dark-base border-uguisu/30' };
      
      if (rc === 0) {
        const checkStr = `${comment}`.toLowerCase();
        if (checkStr.includes('success') || checkStr.includes('done') || checkStr.includes('request executed')) {
          return { status: 'SUCCESS', class: 'text-uguisu-light bg-dark-base border-uguisu/30' };
        }
        return { status: 'Unknown', class: 'text-text-sub bg-dark-base border-dark-border' };
      }

      const rejects = [10004, 10006, 10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020];
      if (rejects.includes(rc)) {
        return { status: 'FAIL', class: 'text-enji-light bg-dark-base border-enji/30' };
      }

      const checkStr = `${comment}`.toLowerCase();
      if (checkStr.includes('fail') || checkStr.includes('reject') || checkStr.includes('error') || checkStr.includes('invalid')) {
        return { status: 'FAIL', class: 'text-enji-light bg-dark-base border-enji/30' };
      }
      if (checkStr.includes('success') || checkStr.includes('done')) {
        return { status: 'SUCCESS', class: 'text-uguisu-light bg-dark-base border-uguisu/30' };
      }

      return { status: 'Unknown', class: 'text-text-sub bg-dark-base border-dark-border' };
    };

    const mapped = summary.map(item => {
      const classification = getClassification(item.retcode, item.comment);
      
      const actionsMap = rcActions[item.retcode] || {};
      const relatedActions = Object.entries(actionsMap)
        .map(([action, cnt]) => `${action} (x${cnt})`)
        .join(', ');

      return {
        ...item,
        classification,
        relatedActions: relatedActions || 'n/a'
      };
    });

    const total = mapped.reduce((acc, item) => acc + item.count, 0);
    let accumulatedPercent = 0;
    return mapped.map(item => {
      const percent = total > 0 ? (item.count / total) * 100 : 0;
      const strokeDashoffset = -accumulatedPercent;
      accumulatedPercent += percent;
      return {
        ...item,
        percent,
        strokeDashoffset
      };
    });
  }, [summary, chains]);

  if (!summary || summary.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Retcode Distribution
        </h4>
        <div className="flex items-center justify-center flex-1 text-text-muted text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  const total = enrichedSummary.reduce((acc, item) => acc + item.count, 0);
  const radius = 15.9155;

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
      <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-uguisu-light/80" />
        Retcode Distribution
      </h4>
      <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
        <div className="w-20 h-20 shrink-0 relative">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {enrichedSummary.map((item, idx) => {
              const isSuccess = item.classification.status === 'SUCCESS';
              const isFail = item.classification.status === 'FAIL';
              const strokeColor = isSuccess ? '#8ba36b' : isFail ? '#9b3f3f' : '#737373';
              const strokeDasharray = `${item.percent} ${100 - item.percent}`;

              return (
                <circle
                  key={idx}
                  r={radius}
                  cx="18"
                  cy="18"
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="4"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={item.strokeDashoffset}
                  className="transition-all duration-300 ease-in-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-mono font-bold text-text-main leading-none">{total}</span>
            <span className="text-[9px] text-text-muted font-sans uppercase mt-1.5 font-bold">Total</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 w-full max-h-48 overflow-y-auto pr-1">
          {enrichedSummary.map((item, idx) => {
            const hasRealComment = item.comment && item.comment !== 'Unknown' && item.comment.trim() !== '';
            
            return (
              <div
                key={idx}
                className="flex flex-col gap-1 p-2 bg-dark-surface border border-dark-border rounded-[3px] text-[12px] font-sans"
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-text-main font-bold text-[14px] font-mono">{item.retcode}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-sans font-semibold uppercase tracking-wider ${item.classification.class}`}>
                      {item.classification.status}
                    </span>
                  </div>
                  <div className="text-text-sub text-[12px] font-sans">
                    Count: <span className="font-bold text-text-main font-mono text-[13px]">{item.count}</span>
                  </div>
                </div>

                {item.relatedActions !== 'n/a' && (
                  <div className="text-text-muted text-[11px] font-sans leading-tight">
                    Actions: <span className="text-text-sub font-mono font-medium text-[11px]">{item.relatedActions}</span>
                  </div>
                )}

                {hasRealComment && (
                  <div className="text-text-muted border-t border-dark-border/40 pt-1 mt-0.5 text-[12px] font-sans italic truncate" title={item.comment}>
                    Comment: {item.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 5. Session Activity Heatmap Component
const SessionActivityHeatmap = ({ events }) => {
  const [hoveredBin, setHoveredBin] = useState(null);

  const heatmapData = useMemo(() => {
    if (!events || events.length === 0) return null;

    const eventTimes = events
      .map(e => new Date(e.timestamp).getTime())
      .filter(t => !isNaN(t));

    if (eventTimes.length < 2) return null;

    const minTime = Math.min(...eventTimes);
    const maxTime = Math.max(...eventTimes);
    const duration = maxTime - minTime;

    const numBins = 30;
    const bins = Array.from({ length: numBins }, (_, i) => {
      const binStart = minTime + (i / numBins) * duration;
      const binEnd = minTime + ((i + 1) / numBins) * duration;
      return {
        id: i,
        binStart,
        binEnd,
        trades: 0,
        system: 0,
        total: 0
      };
    });

    events.forEach(e => {
      const ts = new Date(e.timestamp).getTime();
      if (isNaN(ts)) return;

      const binIndex = Math.min(
        numBins - 1,
        Math.floor(((ts - minTime) / (duration || 1)) * numBins)
      );

      const isTrade =
        (e.correlation_id && e.correlation_id.startsWith('cmd_')) ||
        ['USER_ACTION', 'SEND_TRADE', 'MT5_REQUEST', 'MT5_RESPONSE', 'HTTP_COMMAND_RECEIVED', 'HTTP_COMMAND_RESPONSE_SENT'].includes(e.event);

      if (isTrade) {
        bins[binIndex].trades++;
      } else {
        bins[binIndex].system++;
      }
      bins[binIndex].total++;
    });

    const maxTrades = Math.max(...bins.map(b => b.trades), 1);
    const maxSystem = Math.max(...bins.map(b => b.system), 1);

    return { bins, minTime, maxTime, maxTrades, maxSystem };
  }, [events]);

  if (!heatmapData) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[140px]">
        <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-uguisu-light" />
          Session Activity Heatmap
        </h4>
        <div className="flex items-center justify-center flex-1 text-text-muted text-[13px] font-sans">
          No activity data available
        </div>
      </div>
    );
  }

  const { bins, minTime, maxTime, maxTrades, maxSystem } = heatmapData;

  const formatHourMinSec = (ts) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[1].replace('Z', '').split('.')[0];
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm relative min-h-[140px] select-none">
      <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-3.5 border-b border-dark-border pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-uguisu-light" />
          Session Activity Heatmap
        </span>
        <span className="text-[11px] text-text-muted font-sans">
          Command and sync operations density timeline
        </span>
      </h4>

      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
          <span className="w-24 text-[12px] font-sans font-bold uppercase text-text-sub truncate">Trade Actions</span>
          <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
            {bins.map(b => {
              const weight = b.trades / maxTrades;
              const hasActivity = b.trades > 0;
              const isHovered = hoveredBin === b.id;
              return (
                <div
                  key={b.id}
                  onMouseEnter={() => setHoveredBin(b.id)}
                  onMouseLeave={() => setHoveredBin(null)}
                  className="h-5 rounded-[1px] transition-all cursor-crosshair relative"
                  style={{
                    backgroundColor: hasActivity ? `rgba(139, 163, 107, ${0.15 + weight * 0.85})` : '#181818',
                    border: isHovered ? '1px solid #8ba36b' : '1px solid transparent'
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-24 text-[12px] font-sans font-bold uppercase text-text-sub truncate">System Sync</span>
          <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
            {bins.map(b => {
              const weight = b.system / maxSystem;
              const hasActivity = b.system > 0;
              const isHovered = hoveredBin === b.id;
              return (
                <div
                  key={b.id}
                  onMouseEnter={() => setHoveredBin(b.id)}
                  onMouseLeave={() => setHoveredBin(null)}
                  className="h-5 rounded-[1px] transition-all cursor-crosshair relative"
                  style={{
                    backgroundColor: hasActivity ? `rgba(82, 102, 44, ${0.15 + weight * 0.85})` : '#181818',
                    border: isHovered ? '1px solid #52662c' : '1px solid transparent'
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center text-[12px] font-mono text-text-muted mt-1.5">
          <span className="pl-27">{formatHourMinSec(minTime)}</span>
          <span>{formatHourMinSec(minTime + (maxTime - minTime) / 2)}</span>
          <span>{formatHourMinSec(maxTime)}</span>
        </div>

        {hoveredBin !== null && bins[hoveredBin] && (
          <div
            className="absolute z-20 bottom-full mb-12 bg-dark-card border border-dark-border p-2.5 rounded shadow-xl text-[11px] font-sans text-text-sub w-48 pointer-events-none"
            style={{
              left: `${Math.min(85, Math.max(15, 20 + (hoveredBin / 30) * 80))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="border-b border-dark-border pb-1 mb-1 font-bold text-text-main text-[11px]">
              Interval #{hoveredBin + 1}
              <div className="text-[10px] text-text-muted font-normal font-mono mt-0.5">
                {formatHourMinSec(bins[hoveredBin].binStart)} - {formatHourMinSec(bins[hoveredBin].binEnd)}
              </div>
            </div>
            <div className="flex justify-between mt-0.5 text-uguisu-light font-sans">
              <span>Trades:</span>
              <span className="font-bold font-mono">{bins[hoveredBin].trades}</span>
            </div>
            <div className="flex justify-between mt-0.5 text-uguisu font-sans">
              <span>System Ops:</span>
              <span className="font-bold font-mono">{bins[hoveredBin].system}</span>
            </div>
            <div className="flex justify-between mt-0.5 border-t border-dark-border pt-0.5 text-text-sub text-[11px] font-sans">
              <span>Total Events:</span>
              <span className="font-bold text-text-main font-mono">{bins[hoveredBin].total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 6. Main Component: Visual Diagnostics Section
export default function VisualDiagnostics({ chains, retcodeSummary, events }) {
  if (!chains || chains.length === 0) {
    return null;
  }

  return (
    <div className="px-5 pb-5 shrink-0 flex flex-col gap-4">
      <h3 className="text-[15px] font-sans font-bold text-text-sub uppercase tracking-wider flex items-center gap-2">
        <Activity className="w-4 h-4 text-uguisu-light" />
        Visual Diagnostics
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MT5ExecutionTrend chains={chains} />
        <CommandDurationDistribution chains={chains} />
        <ActionBreakdown chains={chains} />
        <RetcodeDistribution chains={chains} summary={retcodeSummary} />
      </div>

      <SessionActivityHeatmap events={events} />
    </div>
  );
}
