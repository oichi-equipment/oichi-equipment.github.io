import { useState, useMemo } from 'react';
import { Activity, TrendingUp, BarChart3, PieChart, Tag } from 'lucide-react';

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
  DEFAULT: '#a1a1aa'    // Text-muted
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

// 2. Command Duration Distribution Component
const CommandDurationDistribution = ({ chains }) => {
  const [hoveredBinTotal, setHoveredBinTotal] = useState(null);
  const [hoveredBinMt5, setHoveredBinMt5] = useState(null);

  const binData = useMemo(() => {
    if (!chains) return null;
    const tradeChains = chains.filter(c => c.type === 'Trade');
    
    const createBins = () => [
      { id: 0, label: '0-250', min: 0, max: 250, total: 0, closeAll: 0 },
      { id: 1, label: '250-500', min: 250, max: 500, total: 0, closeAll: 0 },
      { id: 2, label: '500-1k', min: 500, max: 1000, total: 0, closeAll: 0 },
      { id: 3, label: '1k+', min: 1000, max: Infinity, total: 0, closeAll: 0 }
    ];

    const totalBins = createBins();
    const mt5Bins = createBins();
    
    let validTotalCount = 0;
    let validMt5Count = 0;

    tradeChains.forEach(c => {
      const isCloseAll = c.action === 'CLOSE_ALL';
      
      const totalVal = c.latencies.totalObserved;
      if (typeof totalVal === 'number' && !isNaN(totalVal)) {
        validTotalCount++;
        const bin = totalBins.find(b => totalVal >= b.min && totalVal < b.max);
        if (bin) {
          bin.total++;
          if (isCloseAll) bin.closeAll++;
        }
      }

      const mt5Val = c.latencies.mt5Execution;
      if (typeof mt5Val === 'number' && !isNaN(mt5Val)) {
        validMt5Count++;
        const bin = mt5Bins.find(b => mt5Val >= b.min && mt5Val < b.max);
        if (bin) {
          bin.total++;
          if (isCloseAll) bin.closeAll++;
        }
      }
    });

    return { totalBins, mt5Bins, validTotalCount, validMt5Count };
  }, [chains]);

  if (!binData || (binData.validTotalCount === 0 && binData.validMt5Count === 0)) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[280px]">
        <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-uguisu-light/80" />
          Command Duration Distribution
        </h4>
        <div className="flex items-center justify-center flex-1 text-[#a1a1aa] text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  const { totalBins, mt5Bins } = binData;
  const maxTotalBin = Math.max(...totalBins.map(b => b.total), 1);
  const maxMt5Bin = Math.max(...mt5Bins.map(b => b.total), 1);

  const renderHistogram = (bins, maxBinTotal, title, hoveredBin, setHoveredBin, type) => (
    <div className="flex-1 flex flex-col relative px-2">
      <div className="text-[14px] font-sans font-bold text-[#f3f4f6] uppercase mb-4 text-center">
        {title}
      </div>
      <div className="flex-1 flex items-end justify-between h-40 border-b border-dark-border relative pb-1 px-2">
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
                <span className="text-[13px] font-mono text-[#f3f4f6] font-bold mb-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {bin.total}
                </span>
              )}

              <div
                className={`w-full max-w-[44px] rounded-t-[2px] overflow-hidden flex flex-col justify-end transition-all ${
                  isHovered
                    ? 'shadow-[0_0_12px_rgba(255,255,255,0.05)] border border-[#555555] bg-dark-surface'
                    : 'border border-transparent'
                }`}
                style={{
                  height: `${Math.max(totalPct, bin.total > 0 ? 5 : 0)}%`,
                  minHeight: bin.total > 0 ? '8px' : '0px'
                }}
              >
                {bin.closeAll > 0 && (
                  <div
                    className="bg-[#d4af37]/80 hover:bg-[#d4af37] border-t border-[#d4af37]/40 transition-colors"
                    style={{ height: `${closeAllPct}%` }}
                  />
                )}
                {bin.total - bin.closeAll > 0 && (
                  <div
                    className="bg-[#4a4a4a] hover:bg-[#5a5a5a] transition-colors flex-1"
                    style={{ height: `${otherPct}%` }}
                  />
                )}
              </div>

              <span className="text-[12px] font-mono text-[#d4d4d8] mt-2 text-center whitespace-nowrap">
                {bin.label}
              </span>

              {isHovered && bin.total > 0 && (
                <div className="absolute z-20 bottom-full mb-6 bg-dark-card border border-dark-border p-2.5 rounded shadow-xl text-[11px] font-sans text-[#d4d4d8] w-40 pointer-events-none -ml-16">
                  <div className="font-bold border-b border-dark-border pb-1 mb-1 text-uguisu-light">
                    {bin.label} ms
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span>Total:</span>
                    <span className="font-bold text-[#f3f4f6] font-mono">{bin.total}</span>
                  </div>
                  <div className="flex justify-between text-uguisu-light/80 mt-0.5">
                    <span>Standard:</span>
                    <span className="font-mono">{bin.total - bin.closeAll}</span>
                  </div>
                  <div className="flex justify-between text-[#d4af37]/80 mt-0.5">
                    <span>CLOSE_ALL:</span>
                    <span className="font-mono text-[#d4af37]">{bin.closeAll}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[280px] relative">
      <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#a1a1aa]" />
            Command Duration Distribution
          </span>
          <span className="text-[12px] font-sans text-[#a1a1aa]">Comparing overall duration vs MT5 execution</span>
        </div>
      </div>

      <div className="flex-1 flex w-full">
        {renderHistogram(totalBins, maxTotalBin, "Total Observed Time", hoveredBinTotal, setHoveredBinTotal, "Total observed")}
        <div className="w-[1px] bg-dark-border mx-2" />
        {renderHistogram(mt5Bins, maxMt5Bin, "MT5 Response Time", hoveredBinMt5, setHoveredBinMt5, "MT5 gateway")}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mt-4 px-1 text-[12px] font-sans">
        <span className="flex items-center gap-1.5 text-[#d4d4d8]">
          <span className="w-2.5 h-2.5 bg-[#4a4a4a] border border-[#5a5a5a] rounded-[1px]" />
          Other Trades
        </span>
        <span className="flex items-center gap-1.5 text-[#d4d4d8]">
          <span className="w-2.5 h-2.5 bg-[#d4af37]/80 border border-[#d4af37]/40 rounded-[1px]" />
          CLOSE_ALL (pos-dep)
        </span>
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
        <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Action Breakdown
        </h4>
        <div className="flex items-center justify-center flex-1 text-[#a1a1aa] text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
      <div className="flex flex-col mb-3 border-b border-dark-border pb-2 gap-1">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Action Breakdown
        </span>
        <span className="text-[11px] font-sans text-[#a1a1aa]">Action breakdown</span>
      </div>

      <div className="flex-1 flex flex-col gap-3 justify-center pr-1 max-h-48 overflow-y-auto">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1 text-[12px] font-sans">
            <div className="flex justify-between items-center text-[#d4d4d8]">
              <span className="flex items-center gap-2 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.action}
              </span>
              <span className="text-[#d4d4d8]">
                <span className="font-mono">{item.count}</span> <span className="text-[10px] text-[#a1a1aa]">/</span> <span className="text-uguisu-light/80 font-mono">{item.percent}%</span>
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
        return { status: 'Unknown', class: 'text-[#d4d4d8] bg-dark-base border-dark-border' };
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

      return { status: 'Unknown', class: 'text-[#d4d4d8] bg-dark-base border-dark-border' };
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
        <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Retcode Distribution
        </h4>
        <div className="flex items-center justify-center flex-1 text-[#a1a1aa] text-[13px] font-sans">
          No data available
        </div>
      </div>
    );
  }

  const total = enrichedSummary.reduce((acc, item) => acc + item.count, 0);
  const radius = 15.9155;

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm min-h-[220px]">
      <div className="flex flex-col mb-3 border-b border-dark-border pb-2 gap-1">
        <span className="text-[13px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2">
          <PieChart className="w-4 h-4 text-uguisu-light/80" />
          Retcode Distribution
        </span>
        <span className="text-[11px] font-sans text-[#a1a1aa]">Result code distribution</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
        <div className="w-20 h-20 shrink-0 relative">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {enrichedSummary.map((item, idx) => {
              const isSuccess = item.classification.status === 'SUCCESS';
              const isFail = item.classification.status === 'FAIL';
              const strokeColor = isSuccess ? '#8ba36b' : isFail ? '#9b3f3f' : '#a1a1aa';
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
            <span className="text-xl font-mono font-bold text-[#f3f4f6] leading-none">{total}</span>
            <span className="text-[9px] text-[#a1a1aa] font-sans uppercase mt-1.5 font-bold">Total</span>
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
                    <span className="text-[#f3f4f6] font-bold text-[14px] font-mono">{item.retcode}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-sans font-semibold uppercase tracking-wider ${item.classification.class}`}>
                      {item.classification.status}
                    </span>
                  </div>
                  <div className="text-[#d4d4d8] text-[12px] font-sans">
                    Count: <span className="font-bold text-[#f3f4f6] font-mono text-[13px]">{item.count}</span>
                  </div>
                </div>

                {item.relatedActions !== 'n/a' && (
                  <div className="text-[#a1a1aa] text-[11px] font-sans leading-tight">
                    Actions: <span className="text-[#d4d4d8] font-mono font-medium text-[11px]">{item.relatedActions}</span>
                  </div>
                )}

                {hasRealComment && (
                  <div className="text-[#a1a1aa] border-t border-dark-border/40 pt-1 mt-0.5 text-[12px] font-sans italic truncate" title={item.comment}>
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

    let minTime = Infinity;
    let maxTime = -Infinity;

    eventTimes.forEach((t) => {
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    });

    if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return null;

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
        <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-3 border-b border-dark-border pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-uguisu-light" />
          Session Activity Heatmap
        </h4>
        <div className="flex items-center justify-center flex-1 text-[#a1a1aa] text-[13px] font-sans">
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
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-3 flex flex-col shadow-sm relative select-none">
      <div className="flex flex-col mb-3 border-b border-dark-border pb-2 gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-uguisu-light" />
            Log Activity
          </span>
          <span className="text-[10px] text-[#a1a1aa] font-sans font-normal normal-case tracking-normal">
            Command density timeline
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
          <span className="w-24 text-[12px] font-sans font-bold uppercase text-[#d4d4d8] truncate">Trade Actions</span>
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
                  className="h-3 rounded-[1px] transition-all cursor-crosshair relative"
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
          <span className="w-24 text-[12px] font-sans font-bold uppercase text-[#d4d4d8] truncate">System Sync</span>
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
                  className="h-3 rounded-[1px] transition-all cursor-crosshair relative"
                  style={{
                    backgroundColor: hasActivity ? `rgba(82, 102, 44, ${0.15 + weight * 0.85})` : '#181818',
                    border: isHovered ? '1px solid #52662c' : '1px solid transparent'
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center text-[12px] font-mono text-[#a1a1aa] mt-1.5">
          <span className="pl-27">{formatHourMinSec(minTime)}</span>
          <span>{formatHourMinSec(minTime + (maxTime - minTime) / 2)}</span>
          <span>{formatHourMinSec(maxTime)}</span>
        </div>

        {hoveredBin !== null && bins[hoveredBin] && (
          <div
            className="absolute z-20 bottom-full mb-12 bg-dark-card border border-dark-border p-2.5 rounded shadow-xl text-[11px] font-sans text-[#d4d4d8] w-48 pointer-events-none"
            style={{
              left: `${Math.min(85, Math.max(15, 20 + (hoveredBin / 30) * 80))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="border-b border-dark-border pb-1 mb-1 font-bold text-[#f3f4f6] text-[11px]">
              Interval #{hoveredBin + 1}
              <div className="text-[10px] text-[#a1a1aa] font-normal font-mono mt-0.5">
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
            <div className="flex justify-between mt-0.5 border-t border-dark-border pt-0.5 text-[#d4d4d8] text-[11px] font-sans">
              <span>Total Events:</span>
              <span className="font-bold text-[#f3f4f6] font-mono">{bins[hoveredBin].total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Latency Comparison Component
const LatencyComparison = ({ stats, totalObservedStats }) => {
  if (!stats) return null;

  const data = [
    { label: 'Total Observed Time', value: totalObservedStats?.p95 !== 'n/a' ? totalObservedStats.p95 : 0, color: '#4a4a4a', isTotal: true },
    { label: 'Post-UI Reflection', value: stats.postExecution?.p95 !== 'n/a' ? stats.postExecution.p95 : 0, color: '#d4af37' },
    { label: 'MT5 Response Time', value: stats.mt5Execution?.p95 !== 'n/a' ? stats.mt5Execution.p95 : 0, color: '#8ba36b' },
    { label: 'Local Processing', value: stats.coreExecution?.p95 !== 'n/a' ? stats.coreExecution.p95 : 0, color: '#52662c' }
  ].filter(d => typeof d.value === 'number' && d.value > 0).sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) return null;

  return (
    <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm select-none">
      <div className="flex flex-col mb-4 border-b border-dark-border pb-2 gap-1">
        <span className="text-[14px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#a1a1aa]" />
          Latency Comparison (95% under this value)
        </span>
        <span className="text-[12px] font-sans text-[#a1a1aa]">Comparing p95 latency across key segments</span>
      </div>
      <div className="flex flex-col gap-3 justify-center py-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1 text-[12px] font-sans">
            <div className="flex justify-between items-center text-[#d4d4d8]">
              <span className={`font-bold font-sans ${item.isTotal ? 'text-[#a1a1aa]' : 'text-[#f3f4f6]'}`}>
                {item.label}
              </span>
              <span className="text-[#f3f4f6] font-mono font-bold">
                {item.value} <span className="text-[10px] text-[#a1a1aa] font-normal">ms</span>
              </span>
            </div>
            <div className="h-4 bg-dark-base rounded-[2px] overflow-hidden w-full border border-dark-border">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color,
                  opacity: item.isTotal ? 0.6 : 0.9
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 6. Main Component: Visual Diagnostics Section
export default function VisualDiagnostics({ chains, retcodeSummary, events, stats, totalObservedStats }) {
  if (!chains || chains.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatencyComparison stats={stats} totalObservedStats={totalObservedStats} />
        <CommandDurationDistribution chains={chains} />
        <ActionBreakdown chains={chains} />
        <RetcodeDistribution chains={chains} summary={retcodeSummary} />
      </div>

      <SessionActivityHeatmap events={events} />
    </div>
  );
}
