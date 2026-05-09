import { useMemo, useState, useRef } from "react";
import { Upload, FileJson, Clock, Activity, AlertCircle, CheckCircle2, Zap, Server, ShieldAlert, Crosshair, AlertTriangle } from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
    setEvents(parsed);
  };

  const metrics = useMemo(() => {
    if (!events.length) {
      return { avgSynk: 0, avgMt5: 0, avgTotal: 0, successRate: 0, bottleneckRate: 0, errorEvents: [] };
    }

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const synkMsArr = events.map((e) => e.timings?.synk_processing_ms || 0);
    const mt5MsArr = events.map((e) => e.timings?.mt5_send_ms || 0);
    const totalMsArr = events.map((e) => e.timings?.total_execution_ms || 0);

    const synk = avg(synkMsArr);
    const mt5 = avg(mt5MsArr);
    const total = avg(totalMsArr);

    const filledEvents = events.filter((e) => e.status === "filled");
    const success = (filledEvents.length / events.length) * 100;
    
    const mt5Pct = total > 0 ? (mt5 / total) * 100 : 0;
    const synkPct = total > 0 ? (synk / total) * 100 : 0;

    return {
      avgSynk: synk.toFixed(1),
      avgMt5: mt5.toFixed(1),
      avgTotal: total.toFixed(1),
      successRate: success.toFixed(1),
      mt5Pct: mt5Pct.toFixed(1),
      synkPct: synkPct.toFixed(1),
      errorEvents: events.filter((e) => e.status !== "filled"),
      count: events.length
    };
  }, [events]);

  const latest = events[events.length - 1];

  // Empty State
  if (!events.length) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-zinc-300 flex flex-col items-center justify-center p-8 selection:bg-rose-500/30">
        <div className="max-w-2xl w-full text-center space-y-8">
          <ShieldAlert className="w-24 h-24 text-zinc-800 mx-auto" />
          <h1 className="text-5xl font-black text-white tracking-tighter">Execution Forensics</h1>
          <p className="text-lg text-zinc-500 font-medium">Drop your JSONL execution logs to instantly identify routing latency and isolate Broker/MT5 bottlenecks.</p>
          
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 transition-all px-10 py-4 font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            Load Execution Log
            <input type="file" className="hidden" accept=".jsonl,.json,.txt" onChange={(e) => handleFile(e.target.files[0])} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-300 font-sans selection:bg-rose-500/30 pb-20">
      
      {/* Persistent Compact Toolbar */}
      <div className="sticky top-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-[1800px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-zinc-300" />
            <span className="font-bold tracking-widest uppercase text-[11px] text-zinc-300">Execution Forensics</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <FileJson className="w-4 h-4 text-zinc-600" />
              <span className="text-sm font-bold text-white tracking-tight">{fileName}</span>
              <span className="text-zinc-700 text-sm mx-1">|</span>
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded">
                {metrics.count} Executions
              </span>
            </div>
            
            <label className="cursor-pointer text-[11px] font-bold uppercase tracking-widest border border-white/10 hover:bg-white/5 text-white px-4 py-1.5 rounded transition-colors">
              Upload New
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" onChange={(e) => handleFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">
        
        {/* Tier 1: Analysis Result (Main Focus) */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6 mb-6">
          
          {/* Main Forensic Result */}
          <div className="bg-[#121214] border border-white/[0.04] rounded-3xl p-12 flex flex-col justify-center relative overflow-hidden shadow-2xl">
            {/* Background warning pattern if broker is bottleneck */}
            {parseFloat(metrics.avgMt5) > 50 && (
              <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            )}
            
            <div className="text-rose-500 font-bold tracking-widest uppercase text-xs mb-8 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Detected Delay Source
            </div>

            <div className="mb-14 relative z-10">
              <h2 className="text-7xl md:text-8xl font-black text-white tracking-tighter mb-6">MT5 / Broker</h2>
              <div className="flex items-end gap-5">
                <span className="text-6xl font-mono text-rose-500 font-bold leading-none">{metrics.avgMt5}<span className="text-4xl text-rose-500/50 ml-1">ms</span></span>
                <span className="text-xl text-zinc-500 font-bold pb-1">Average Latency <span className="text-zinc-600 font-normal">({metrics.mt5Pct}% of total execution)</span></span>
              </div>
            </div>

            <div className="border-t border-white/[0.04] pt-8 flex items-center gap-16 relative z-10">
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Synk Internal Routing</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-mono text-emerald-400 font-bold">{metrics.avgSynk}ms</span>
                  <span className="text-zinc-500 text-sm font-medium border border-white/5 bg-white/[0.02] px-2 py-0.5 rounded">Ultra-Fast ({metrics.synkPct}%)</span>
                </div>
              </div>
              <div className="w-px h-12 bg-white/[0.04]"></div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Responsibility Source</div>
                <div className="text-2xl font-bold text-white tracking-tight">External Environment</div>
              </div>
            </div>
          </div>

          {/* Responsibility Breakdown & Pipeline */}
          <div className="bg-[#121214] border border-white/[0.04] rounded-3xl p-10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500">Execution Pipeline Forensics</h3>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold border border-white/5 px-2 py-1 rounded">Latest Event</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full relative">
               <PipelineNode stage="Alert Received" ms="0.0" isFast={true} />
               <PipelineEdge ms={latest?.timings?.synk_processing_ms} />
               
               <PipelineNode stage="Synk Routing Engine" ms={latest?.timings?.synk_processing_ms} isFast={true} />
               <PipelineEdge ms={latest?.timings?.mt5_send_ms} isProblem={true} />
               
               <PipelineNode stage="MT5 Terminal / Broker" ms={latest?.timings?.mt5_send_ms} isFast={false} isProblem={true} />
               <PipelineEdge ms={0} />

               <PipelineNode stage={latest?.status === 'filled' ? 'Order Filled' : 'Order Rejected'} ms={latest?.timings?.total_execution_ms} isFast={latest?.status === 'filled'} isFinal={true} />
            </div>
          </div>
        </div>

        {/* Tier 2 & 3: Compact KPI and Errors */}
        <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6 mb-6">
          
          {/* Compact KPIs */}
          <div className="grid grid-cols-2 gap-6">
             <SmallKpi label="Success Rate" value={`${metrics.successRate}%`} highlight={parseFloat(metrics.successRate) > 90 ? 'emerald' : 'rose'} />
             <SmallKpi label="Total Executions" value={metrics.count} />
             <SmallKpi label="Avg End-to-End" value={`${metrics.avgTotal}ms`} />
             <SmallKpi label="Avg Routing (Synk)" value={`${metrics.avgSynk}ms`} highlight="emerald" />
          </div>

          {/* Error Diagnostics (Crucial for support) */}
          <div className="bg-[#121214] border border-white/[0.04] rounded-3xl p-8 flex flex-col h-[300px] shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> Reject Diagnostics
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded">
                {metrics.errorEvents.length} Issues Found
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-3 space-y-3 custom-scrollbar">
              {metrics.errorEvents.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-emerald-500/40 text-xs font-bold tracking-widest uppercase">
                   No execution errors recorded
                 </div>
              ) : (
                metrics.errorEvents.map((err, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-4 bg-rose-500/[0.03] border border-rose-500/10 rounded-xl hover:bg-rose-500/[0.05] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-sm tracking-tight">{err.symbol}</span>
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded shadow-sm">
                        CODE: {err.mt5?.retcode || 'UNKNOWN'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400 font-medium">{err.mt5?.comment}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tier 3: Historical Heatmap */}
        <div className="bg-[#121214] border border-white/[0.04] rounded-3xl p-8 shadow-2xl">
           <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-600 mb-6 flex justify-between">
             <span>Historical Latency Density (Total ms)</span>
             <span className="text-zinc-700">Latest 150 Executions</span>
           </h3>
           <div className="flex items-end gap-[2px] h-28">
             {events.slice(-150).map((e, i) => {
                const lat = e.timings?.total_execution_ms || 0;
                const heightPct = Math.max(8, Math.min(100, (lat / 500) * 100));
                
                let color = 'bg-emerald-500/90';
                if(lat > 250) color = 'bg-rose-500/90 shadow-[0_0_10px_rgba(244,63,94,0.3)] z-10';
                else if(lat > 100) color = 'bg-amber-500/90';
                else if(lat === 0) color = 'bg-zinc-800';
                
                return (
                  <div key={i} className="flex-1 group relative flex justify-center h-full items-end">
                    <div className={`w-full rounded-[1px] transition-all hover:brightness-125 ${color}`} style={{ height: `${heightPct}%` }}></div>
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black border border-white/10 text-white font-mono font-bold text-[10px] py-1 px-2 rounded pointer-events-none z-20 shadow-xl">
                      {lat}ms
                    </div>
                  </div>
                )
             })}
           </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------
// Components for Forensic Report UI
// ----------------------------------------

function SmallKpi({ label, value, highlight }) {
  let color = 'text-white';
  if (highlight === 'emerald') color = 'text-emerald-400';
  if (highlight === 'rose') color = 'text-rose-400';

  return (
    <div className="bg-[#121214] border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-center shadow-lg hover:border-white/10 transition-colors">
       <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2.5">{label}</div>
       <div className={`text-3xl font-mono font-bold tracking-tighter ${color}`}>{value}</div>
    </div>
  )
}

function PipelineNode({ stage, ms, isFast, isProblem, isFinal }) {
  let dotStyle = "border-zinc-700 bg-[#121214]";
  let textStyle = "text-zinc-300";
  let msStyle = "text-zinc-600";

  if (isProblem) {
    dotStyle = "border-rose-500 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-125";
    textStyle = "text-rose-400 font-bold";
    msStyle = "text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded";
  } else if (isFast && !isFinal) {
    dotStyle = "border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
    msStyle = "text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded";
  } else if (isFinal && isFast) {
    dotStyle = "border-emerald-500 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-125";
    textStyle = "text-white font-bold";
    msStyle = "text-white font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30";
  } else if (isFinal && !isFast) {
    dotStyle = "border-zinc-600 bg-zinc-600";
    textStyle = "text-zinc-400 font-bold";
    msStyle = "text-zinc-500 font-bold";
  }

  return (
    <div className="flex items-center gap-5 relative z-10 w-full">
      <div className={`w-3 h-3 rounded-full border-[3px] shrink-0 transition-all ${dotStyle}`}></div>
      <div className="flex-1 flex items-center justify-between bg-black/30 border border-white/5 p-3.5 rounded-xl">
         <span className={`text-[13px] tracking-wide ${textStyle}`}>{stage}</span>
         {ms !== undefined && <span className={`text-xs font-mono ${msStyle}`}>{ms}ms</span>}
      </div>
    </div>
  )
}

function PipelineEdge({ ms, isProblem }) {
  return (
    <div className="ml-[5px] py-3.5 border-l-2 border-dashed border-white/10 flex items-center w-full">
      <div className="pl-8 h-full flex items-center">
         {isProblem ? (
           <div className="flex items-center gap-2.5 text-rose-400 font-bold bg-rose-500/10 px-3.5 py-1.5 rounded-lg border border-rose-500/20 text-xs shadow-lg">
             <AlertTriangle className="w-3.5 h-3.5" />
             ↓ {ms}ms delay
             <span className="ml-2 font-black uppercase tracking-widest text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded">Problem Area</span>
           </div>
         ) : (
           <div className="text-xs font-mono text-emerald-500/60 font-semibold flex items-center gap-2">
             ↓ {ms}ms
           </div>
         )}
      </div>
    </div>
  )
}
