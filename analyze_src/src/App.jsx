import React, { useState, useMemo, useRef } from 'react';
import { 
  Activity, Upload, AlertTriangle, Server, 
  Search, BarChart3, Database,
  AlertCircle, ArrowRightLeft, Crosshair, X, Network
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// 純粋なダークグレー（Zinc系）で統一したパレット
const THEME = {
  bg: 'bg-[#09090B]', 
  panel: 'bg-[#121214]', 
  panelBorder: 'border-[#27272A]', 
  radius: 'rounded-[3px]', 
  textPrimary: 'text-[#F1F5F9]',
  textSecondary: 'text-[#94A3B8]', 
  textMuted: 'text-[#52525B]', 
  synk: { 
    text: 'text-[#708B4B]', 
    bg: 'bg-[#708B4B]',
  },
  normal: { 
    text: 'text-[#E2E8F0]', 
    bg: 'bg-[#52525B]',
  },
  warning: { 
    text: 'text-[#D97706]', 
    bg: 'bg-[#B45309]',
  },
  error: { 
    text: 'text-[#DC2626]', 
    bg: 'bg-[#991B1B]' 
  }
};

const getLatencyColor = (ms) => {
  if (ms > 400) return THEME.error.text;
  if (ms > 200) return THEME.warning.text;
  return THEME.textPrimary;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${THEME.panel} border ${THEME.panelBorder} ${THEME.radius} p-3 font-mono text-xs shadow-none`}>
        <div className={`${THEME.textSecondary} mb-2 border-b ${THEME.panelBorder} pb-1`}>
          {label && !isNaN(new Date(label).getTime()) ? new Date(label).toLocaleTimeString() : label}
        </div>
        <div className="flex justify-between gap-6 items-center mt-1">
          <span className={THEME.textPrimary}>MT5/Broker:</span>
          <span className={`${THEME.textPrimary} font-medium`}>{payload[0].value} ms</span>
        </div>
        <div className="flex justify-between gap-6 items-center">
          <span className={THEME.synk.text}>Synk Engine:</span>
          <span className={`${THEME.synk.text} font-medium`}>{payload[1].value} ms</span>
        </div>
        <div className={`flex justify-between gap-6 items-center mt-2 pt-1 border-t ${THEME.panelBorder}`}>
          <span className={THEME.textSecondary}>Total:</span>
          <span className={`${THEME.textSecondary} font-medium`}>{(payload[0].value + payload[1].value).toFixed(2)} ms</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function SynkAnalyze() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    
    const newSessions = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const parsed = text
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(Boolean)
          .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

        if (parsed.length > 0) {
          const sessionId = `ses_${Date.now().toString().slice(-6)}_${i}`;
          newSessions.push({
            id: sessionId,
            name: file.name,
            data: parsed,
            stats: calculateStats(parsed)
          });
        }
      }

      if (newSessions.length === 0) {
        alert("No valid JSON logs found in the selected files.");
      } else {
        setSessions(prev => [...newSessions, ...prev]);
        setActiveSessionId(newSessions[0].id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse log files.");
    } finally {
      setIsUploading(false);
    }
  };

  const calculateStats = (data) => {
    if (!data || !data.length) return {
      count: 0, volume: "0.00", errors: 0, avgSynk: "0.00", avgMt5: "0.00",
      avgTotal: "0.00", last50Avg: "0.00", last10Avg: "0.00", synkRatio: "0.00", mt5Ratio: "0.00"
    };
    
    let totalSynk = 0, totalMt5 = 0, totalVol = 0, errCount = 0;
    
    data.forEach(d => {
      totalSynk += (d.timings?.synk_processing_ms || 0);
      totalMt5 += (d.timings?.mt5_send_ms || 0);
      totalVol += (d.volume || 0);
      if (d.status !== 'filled') errCount++;
    });

    const last50 = data.slice(-50);
    const last10 = data.slice(-10);
    const last50Synk = last50.reduce((acc, d) => acc + (d.timings?.synk_processing_ms || 0), 0);
    const last50Mt5 = last50.reduce((acc, d) => acc + (d.timings?.mt5_send_ms || 0), 0);
    const last10Synk = last10.reduce((acc, d) => acc + (d.timings?.synk_processing_ms || 0), 0);
    const last10Mt5 = last10.reduce((acc, d) => acc + (d.timings?.mt5_send_ms || 0), 0);

    const avgSynk = totalSynk / data.length;
    const avgMt5 = totalMt5 / data.length;
    const avgTotal = avgSynk + avgMt5;

    return {
      count: data.length,
      volume: totalVol.toFixed(2),
      errors: errCount,
      avgSynk: avgSynk.toFixed(2),
      avgMt5: avgMt5.toFixed(2),
      avgTotal: avgTotal.toFixed(2),
      last50SynkAvg: last50.length ? (last50Synk / last50.length).toFixed(2) : "0.00",
      last50Mt5Avg: last50.length ? (last50Mt5 / last50.length).toFixed(2) : "0.00",
      last10SynkAvg: last10.length ? (last10Synk / last10.length).toFixed(2) : "0.00",
      last10Mt5Avg: last10.length ? (last10Mt5 / last10.length).toFixed(2) : "0.00",
      synkRatio: avgTotal > 0 ? ((avgSynk / avgTotal) * 100).toFixed(2) : "0.00",
      mt5Ratio: avgTotal > 0 ? ((avgMt5 / avgTotal) * 100).toFixed(2) : "0.00"
    };
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const isWarningStatus = activeSession ? activeSession.stats.avgMt5 > 150 : false;
  
  const timelineData = useMemo(() => {
    if (!activeSession) return [];
    const factor = Math.ceil(activeSession.data.length / 120); 
    return activeSession.data.filter((_, i) => i % factor === 0).map(d => ({
      time: d.timestamp,
      synk: d.timings?.synk_processing_ms || 0,
      mt5: d.timings?.mt5_send_ms || 0,
      warnThreshold: 200
    }));
  }, [activeSession]);

  const worstIncidents = useMemo(() => {
    if (!activeSession) return [];
    return [...activeSession.data]
      .sort((a, b) => (b.timings?.total_execution_ms || 0) - (a.timings?.total_execution_ms || 0))
      .slice(0, 50);
  }, [activeSession]);

  return (
    <div 
      className={`relative h-screen w-screen ${THEME.bg} text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-[#708B4B] selection:text-white`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if(e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-4 border-dashed border-[#708B4B] m-6 rounded-2xl flex items-center justify-center shadow-[0_0_100px_rgba(112,139,75,0.2)]">
          <div className="flex flex-col items-center gap-6 text-[#708B4B]">
            <Upload className="w-20 h-20 animate-bounce" />
            <h2 className="text-4xl font-bold tracking-tight">Drop Execution Log Here</h2>
            <p className="font-mono text-sm uppercase tracking-widest opacity-80">Instant Local Parsing</p>
          </div>
        </div>
      )}

      <header className={`h-12 border-b ${THEME.panelBorder} ${THEME.panel} flex items-center px-4 justify-between shrink-0`}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${THEME.textPrimary} font-semibold`}>
            <img 
              src="/analyze/logo-mark.png" 
              alt="Synk Mushroom" 
              className="w-8 h-8 object-contain" 
            />
            <span className="tracking-tight text-sm">
              Synk Mushroom <span className={`${THEME.textSecondary} font-normal tracking-wide ml-1`}>Analyze</span>
            </span>
          </div>
          <div className={`h-4 w-px bg-[#27272A]`}></div>
          <div className="flex items-center gap-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`px-3 py-1 text-xs font-mono flex items-center gap-2 border transition-none ${THEME.radius} ${
                  activeSessionId === s.id 
                    ? `bg-[#27272A] ${THEME.textPrimary} border-[#3F3F46]` 
                    : `${THEME.textSecondary} border-transparent hover:bg-[#27272A]`
                }`}
              >
                <Database className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 transition-none ${THEME.radius} ${
              compareMode ? `bg-[#27272A] border-[#3F3F46] ${THEME.textPrimary}` : `border-[#27272A] ${THEME.textSecondary} hover:bg-[#27272A]`
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Compare
          </button>
          
          <label className={`cursor-pointer px-4 py-1.5 text-xs font-medium border ${THEME.panelBorder} ${THEME.textPrimary} hover:bg-[#27272A] flex items-center gap-2 disabled:opacity-50 transition-none ${THEME.radius}`}>
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Parsing...' : 'Upload .jsonl Log'}
            <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
          </label>
        </div>
      </header>

      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center flex flex-col items-center ${THEME.textMuted} max-w-lg`}>
            <div className="w-20 h-20 border border-[#27272A] bg-[#121214] rounded-xl flex items-center justify-center mb-6 shadow-xl">
              <Upload className="w-8 h-8 text-[#94A3B8]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#F1F5F9] tracking-tight mb-2">Drop Synk Mushroom telemetry logs</h1>
            <p className="text-sm text-[#94A3B8] mb-8">Local browser analysis only. No upload. No cloud. No telemetry leaves your PC.</p>
            
            <div className="flex items-center justify-center gap-6 text-xs font-mono tracking-widest uppercase mb-10 text-[#52525B]">
              <div className="flex items-center gap-2"><Search className="w-3.5 h-3.5"/> Multiple logs</div>
              <div className="flex items-center gap-2"><ArrowRightLeft className="w-3.5 h-3.5"/> Compare sessions</div>
            </div>
            
            <label className={`cursor-pointer px-6 py-3 text-sm font-semibold border ${THEME.panelBorder} text-[#F1F5F9] bg-[#121214] hover:bg-[#27272A] flex items-center gap-2 transition-colors ${THEME.radius} shadow-lg`}>
              <Upload className="w-4 h-4" />
              Select JSONL File
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
          </div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          
          <div className="flex gap-3 shrink-0 h-48">
            
            {/* Left Panel: Responsibility & Pipeline (w-[35%] に調整しタブ幅と調和) */}
            <div className={`${THEME.panel} border ${THEME.panelBorder} ${THEME.radius} w-[35%] flex flex-col overflow-hidden`}>
              <div className={`p-2.5 px-3 border-b ${THEME.panelBorder} flex justify-between items-center bg-[#09090B]`}>
                <h2 className={`text-xs font-semibold ${THEME.textSecondary} uppercase tracking-widest flex items-center gap-2`}>
                  <Crosshair className="w-4 h-4" />
                  Responsibility Breakdown
                </h2>
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2.5">
                  <div className="flex items-center gap-2">
                    <Network className={`w-5 h-5 ${THEME.synk.text}`} />
                    <span className={`text-2xl font-mono font-semibold ${THEME.synk.text}`}>Synk: {activeSession.stats.avgSynk}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-mono font-semibold ${THEME.textPrimary}`}>External: {activeSession.stats.avgMt5}ms</span>
                    <Server className={`w-5 h-5 ${THEME.textSecondary}`} />
                  </div>
                </div>
                
                <div className="flex justify-between items-end mb-2 mt-1">
                  <span className={`text-[10px] uppercase font-mono tracking-widest ${THEME.synk.text}`}>Latency Composition</span>
                  <div className="flex gap-4 text-xs uppercase font-mono tracking-widest font-medium">
                    <span className={THEME.synk.text} title="Synk internal processing ratio">Synk {activeSession.stats.synkRatio}%</span>
                    <span className={THEME.textSecondary} title="External execution ratio">Ext {activeSession.stats.mt5Ratio}%</span>
                  </div>
                </div>
                <div className={`h-2.5 w-full bg-[#09090B] flex ${THEME.radius} overflow-hidden`}>
                  <div 
                    style={{ width: `${Math.max(Number(activeSession.stats.synkRatio), 1)}%` }} 
                    className={`${THEME.synk.bg}`} 
                  />
                  <div 
                    style={{ width: `${100 - Math.max(Number(activeSession.stats.synkRatio), 1)}%` }} 
                    className={`${THEME.normal.bg}`} 
                  />
                </div>
              </div>

              {/* Compact Pipeline inside Left Panel */}
              <div className={`p-2 px-4 border-t ${THEME.panelBorder} bg-[#121214] flex flex-col justify-center h-[72px] shrink-0`}>
                <div className="flex items-center justify-between relative w-full mt-1">
                  <div className={`absolute left-4 right-4 top-[35%] -translate-y-1/2 h-[1px] ${THEME.panelBorder}`}></div>
                  <div className={`absolute left-[12%] w-[18%] top-[35%] -translate-y-1/2 h-[2px] ${THEME.synk.bg}`}></div>
                  <div className={`absolute left-[45%] w-[35%] top-[35%] -translate-y-1/2 h-[2px] ${isWarningStatus ? THEME.warning.bg : THEME.normal.bg}`}></div>
                  
                  <div className="relative z-10 flex flex-col items-center bg-[#121214] px-2">
                    <Activity className={`w-4 h-4 mb-1.5 ${THEME.textSecondary}`} />
                    <span className={`text-[10px] font-mono ${THEME.textSecondary}`}>TV</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center bg-[#121214] px-2">
                    <div className={`w-5 h-5 border border-[#708B4B] flex items-center justify-center ${THEME.synk.text} bg-[#09090B] ${THEME.radius} mb-1.5`}>
                      <img src="/analyze/logo-mark.png" className="w-3 h-3 object-contain" alt="logo" />
                    </div>
                    <span className={`text-[10px] font-mono font-medium ${THEME.synk.text}`}>Synk</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center bg-[#121214] px-2 mt-[-10px]">
                    <span className={`text-xs font-mono font-bold mb-0.5 px-1.5 py-0.5 bg-[#09090B] border ${THEME.panelBorder} ${THEME.radius} ${activeSession.stats.avgMt5 > 400 ? THEME.error.text : isWarningStatus ? THEME.warning.text : THEME.textPrimary} shadow-sm`}>
                      {activeSession.stats.avgMt5}ms
                    </span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center bg-[#121214] px-2">
                    <Server className={`w-4 h-4 mb-1.5 ${activeSession.stats.avgMt5 > 400 ? THEME.error.text : isWarningStatus ? THEME.warning.text : THEME.textPrimary}`} />
                    <span className={`text-[10px] font-mono ${activeSession.stats.avgMt5 > 400 ? THEME.error.text : isWarningStatus ? THEME.warning.text : THEME.textSecondary}`}>MT5</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center bg-[#121214] px-2">
                    <Database className={`w-4 h-4 mb-1.5 ${THEME.textSecondary}`} />
                    <span className={`text-[10px] font-mono ${THEME.textSecondary}`}>Broker</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Primary Status (w-[65%] に調整し十分な余白を確保) */}
            <div className={`${THEME.panel} border ${THEME.panelBorder} ${THEME.radius} w-[65%] flex flex-col`}>
              <div className={`p-2.5 px-3 border-b ${THEME.panelBorder} flex justify-between items-center bg-[#09090B]`}>
                <h2 className={`text-xs font-semibold ${THEME.textSecondary} uppercase tracking-widest flex items-center gap-2`}>
                  <Activity className="w-4 h-4" />
                  Execution Latency Status
                </h2>
                <div className="flex gap-4 text-[10px] font-mono">
                  <span className={`flex items-center gap-1.5 ${THEME.textSecondary}`}><span className={`w-2 h-2 bg-[#52525B] ${THEME.radius}`}></span> Normal</span>
                  <span className={`flex items-center gap-1.5 ${THEME.warning.text}`}><span className={`w-2 h-2 ${THEME.warning.bg} ${THEME.radius}`}></span> Degraded</span>
                  <span className={`flex items-center gap-1.5 ${THEME.error.text}`}><span className={`w-2 h-2 ${THEME.error.bg} ${THEME.radius}`}></span> Critical</span>
                </div>
              </div>
              
              <div className="flex-1 px-6 py-4 flex items-center justify-between gap-6">
                <div className="flex-1 flex flex-col">
                  <div className={`text-sm font-semibold mb-3 ${THEME.textSecondary} uppercase tracking-widest`}>Session Avg</div>
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.synk.text}`}>Synk</span>
                      <div className={`text-3xl font-light font-mono ${THEME.synk.text} tracking-tight`}>{activeSession.stats.avgSynk}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                    <div className="w-px h-8 bg-[#27272A] mb-1"></div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.textSecondary}`}>External</span>
                      <div className={`text-3xl font-light font-mono ${getLatencyColor(activeSession.stats.avgMt5)} tracking-tight`}>{activeSession.stats.avgMt5}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                  </div>
                </div>
                <div className="w-px h-20 bg-[#27272A]"></div>
                <div className="flex-1 flex flex-col">
                  <div className={`text-sm font-semibold mb-3 ${THEME.textSecondary} uppercase tracking-widest`}>Last 50 Avg</div>
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.synk.text}`}>Synk</span>
                      <div className={`text-3xl font-light font-mono ${THEME.synk.text} tracking-tight`}>{activeSession.stats.last50SynkAvg}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                    <div className="w-px h-8 bg-[#27272A] mb-1"></div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.textSecondary}`}>External</span>
                      <div className={`text-3xl font-light font-mono ${getLatencyColor(activeSession.stats.last50Mt5Avg)} tracking-tight`}>{activeSession.stats.last50Mt5Avg}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                  </div>
                </div>
                <div className="w-px h-20 bg-[#27272A]"></div>
                <div className="flex-1 flex flex-col">
                  <div className={`text-sm font-semibold mb-3 ${THEME.textSecondary} uppercase tracking-widest`}>Last 10 Avg</div>
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.synk.text}`}>Synk</span>
                      <div className={`text-3xl font-light font-mono ${THEME.synk.text} tracking-tight`}>{activeSession.stats.last10SynkAvg}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                    <div className="w-px h-8 bg-[#27272A] mb-1"></div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-mono mb-1 ${THEME.textSecondary}`}>External</span>
                      <div className={`text-3xl font-light font-mono ${getLatencyColor(activeSession.stats.last10Mt5Avg)} tracking-tight`}>{activeSession.stats.last10Mt5Avg}<span className="text-sm opacity-50 ml-0.5">ms</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${THEME.panel} border ${THEME.panelBorder} ${THEME.radius} flex-1 min-h-[220px] flex flex-col`}>
            <div className={`p-2.5 px-3 border-b ${THEME.panelBorder} flex justify-between items-center bg-[#09090B] shrink-0`}>
              <h2 className={`text-xs font-semibold ${THEME.textSecondary} uppercase tracking-widest flex items-center gap-2`}>
                <BarChart3 className="w-4 h-4" />
                Latency Distribution
              </h2>
              <div className="flex gap-4 text-[10px] font-mono">
                <span className={THEME.textSecondary}>Points: {activeSession.stats.count}</span>
                <span className={activeSession.stats.errors > 0 ? THEME.error.text : THEME.textSecondary}>
                  Errors: {activeSession.stats.errors}
                </span>
              </div>
            </div>
            
            <div className="flex-1 p-2 pb-0 w-full relative">
              <div className="absolute top-3 left-4 z-10 pointer-events-none bg-[#09090B] border border-[#27272A] p-2">
                <div className={`text-xs font-mono ${THEME.textPrimary} flex items-center gap-2 mb-1`}><div className="w-3 h-0.5 bg-[#94A3B8]"></div> MT5 External</div>
                <div className={`text-xs font-mono ${THEME.synk.text} flex items-center gap-2`}><div className={`w-3 h-0.5 ${THEME.synk.bg}`}></div> Synk Base</div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis 
                    stroke="#27272A" 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }} 
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525B', strokeWidth: 1 }} />
                  <ReferenceLine y={200} stroke="#D97706" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Warn: 200ms', fill: '#D97706', fontSize: 10 }} />
                  
                  <Line type="monotone" dataKey="mt5" stroke="#94A3B8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="synk" stroke="#708B4B" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${THEME.panel} border ${THEME.panelBorder} ${THEME.radius} h-[38%] min-h-[240px] flex flex-col shrink-0 overflow-hidden`}>
            <div className={`p-2.5 px-3 border-b ${THEME.panelBorder} flex justify-between items-center bg-[#09090B] shrink-0`}>
              <h2 className={`text-xs font-semibold ${THEME.textSecondary} uppercase tracking-widest flex items-center gap-2`}>
                <AlertTriangle className="w-4 h-4" />
                Event Logs (Sort: Total Latency)
              </h2>
              <div className="relative">
                <Search className={`w-3 h-3 ${THEME.textMuted} absolute left-2.5 top-1/2 -translate-y-1/2`} />
                <input 
                  type="text" 
                  placeholder="ID search..." 
                  className={`bg-[#09090B] border ${THEME.panelBorder} ${THEME.radius} text-xs px-2 py-1 pl-7 ${THEME.textPrimary} focus:outline-none focus:border-[#475569] w-48 font-mono placeholder:text-[#475569]`}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-[#09090B]">
              <table className="w-full text-left border-collapse">
                <thead className={`sticky top-0 bg-[#121214] z-10 text-xs uppercase tracking-widest ${THEME.textSecondary} border-b ${THEME.panelBorder} font-mono shadow-sm`}>
                  <tr>
                    <th className="py-2.5 px-4 font-normal">Time</th>
                    <th className="py-2.5 px-4 font-normal">Event ID</th>
                    <th className="py-2.5 px-4 font-normal">Symbol</th>
                    <th className="py-2.5 px-4 font-normal">Side</th>
                    <th className="py-2.5 px-4 font-normal text-right">Synk Ms</th>
                    <th className="py-2.5 px-4 font-normal text-right">MT5 Ms</th>
                    <th className="py-2.5 px-4 font-normal text-right">Total Ms</th>
                    <th className="py-2.5 px-4 font-normal pl-6">Bottleneck</th>
                    <th className="py-2.5 px-4 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-[#27272A] text-sm">
                  {worstIncidents.map((incident, idx) => {
                    const mt5Ms = incident.timings?.mt5_send_ms || 0;
                    const synkMs = incident.timings?.synk_processing_ms || 0;
                    const totalMs = incident.timings?.total_execution_ms || 0;
                    const mt5Color = getLatencyColor(mt5Ms);
                    const isWarnOrErr = mt5Ms > 200;
                    const isRejected = incident.status !== 'filled';
                    const timeStr = incident.timestamp && !isNaN(new Date(incident.timestamp).getTime()) 
                                      ? new Date(incident.timestamp).toISOString().split('T')[1].replace('Z','') 
                                      : '-';
                    
                    return (
                      <tr key={idx} className="hover:bg-[#18181B] cursor-pointer transition-colors duration-75">
                        <td className={`py-2.5 px-4 ${THEME.textSecondary} whitespace-nowrap`}>{timeStr}</td>
                        <td className={`py-2.5 px-4 ${THEME.textSecondary}`}>{incident.event_id || '-'}</td>
                        <td className={`py-2.5 px-4 text-slate-200 font-light`}>{incident.symbol || '-'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-1.5 py-0.5 text-xs border ${THEME.panelBorder} ${THEME.textSecondary}`}>
                            {incident.side || '-'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right ${THEME.synk.text}`}>{synkMs}</td>
                        <td className={`py-2.5 px-4 text-right ${mt5Color}`}>{mt5Ms}</td>
                        <td className={`py-2.5 px-4 text-right ${isWarnOrErr ? THEME.textPrimary : THEME.textSecondary} text-sm font-light`}>{totalMs}</td>
                        <td className="py-2.5 px-4 pl-6">
                          {incident.bottleneck_stage && incident.bottleneck_stage !== 'none' ? (
                            <span className={`flex items-center gap-1.5 ${THEME.warning.text}`}>
                              <AlertCircle className="w-3.5 h-3.5" /> {incident.bottleneck_stage.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className={THEME.textMuted}>-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isRejected ? (
                            <span className={`${THEME.error.text} flex items-center gap-1.5`} title={incident.mt5?.comment || 'Rejected'}>
                              <X className="w-3.5 h-3.5" /> Failed
                            </span>
                          ) : (
                            <span className={THEME.textSecondary}>Filled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
        </main>
      )}
    </div>
  );
}