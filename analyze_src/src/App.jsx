import { useMemo, useState } from "react";
import { Upload, FileJson, Clock, Activity, AlertCircle, CheckCircle2, ChevronRight, Zap, ArrowRight, Server, FileText, BarChart3, Crosshair, Bell, Send } from 'lucide-react'

export default function App() {
  const [events, setEvents] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file) => {
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
    const bottleneck = (events.filter((e) => e.bottleneck_stage === "mt5_terminal").length / events.length) * 100;

    return {
      avgSynk: synk.toFixed(1),
      avgMt5: mt5.toFixed(1),
      avgTotal: total.toFixed(1),
      successRate: success.toFixed(1),
      bottleneckRate: bottleneck.toFixed(1),
      errorEvents: events.filter((e) => e.status !== "filled"),
      count: events.length
    };
  }, [events]);

  const latest = events[events.length - 1];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-300 font-sans selection:bg-cyan-500/30 pb-20">
      <div className="max-w-[1680px] mx-auto px-8 md:px-12 py-12 md:py-16">
        
        {/* Header - High-end SaaS style */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-lg shadow-black/50">
               <Activity className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Synk Mushroom Analyze</h1>
              <p className="text-[13px] text-zinc-500 mt-0.5 font-medium tracking-wide">Local Execution Diagnostics</p>
            </div>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-semibold text-zinc-400">
            <button className="hover:text-white transition-colors">Documentation</button>
            <button className="hover:text-white transition-colors">Architecture</button>
            <button className="h-9 px-5 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 duration-300">
              GitHub Repo
            </button>
          </div>
        </header>

        {/* Hero Upload Section (Dominant Focus) */}
        {!events.length && (
          <div className="max-w-4xl mx-auto mt-32 mb-40">
            <div className="text-center mb-14">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6">Analyze Execution Data</h2>
              <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed font-medium">
                Drop your JSONL execution logs to instantly visualize routing latency, pinpoint MT5 bottlenecks, and verify order health.
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`relative overflow-hidden rounded-[40px] border transition-all duration-500 ease-out ${isDragging ? 'border-cyan-500/50 bg-cyan-500/5 scale-[1.02]' : 'border-white/10 bg-[#121214] hover:border-white/20 hover:bg-[#16161A]'}`}
            >
              {/* Subtle background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
              
              <div className="px-12 py-28 text-center relative z-10">
                <div className="w-24 h-24 mx-auto rounded-[28px] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/5 flex items-center justify-center mb-10 shadow-2xl">
                  <Upload className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-cyan-400' : 'text-zinc-500'}`} />
                </div>
                <h3 className="text-3xl font-semibold text-white mb-4 tracking-tight">Drop your logs here</h3>
                <p className="text-zinc-500 mb-12 font-medium">Supports .jsonl and .json formats</p>
                
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-all px-10 py-4 font-bold shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] hover:scale-105 duration-300">
                  Browse Files
                  <input type="file" className="hidden" accept=".jsonl,.json,.txt" onChange={(e) => { if(e.target.files[0]) handleFile(e.target.files[0]); }} />
                </label>

                <div className="mt-16 text-[13px] font-semibold text-zinc-500 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  100% Local Parsing. No data leaves your browser.
                </div>
              </div>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            
            {/* Header info bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-8 border-b border-white/[0.06]">
               <div>
                 <h2 className="text-4xl font-bold text-white tracking-tight mb-3">Execution Report</h2>
                 <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
                   <span className="flex items-center gap-2"><FileJson className="w-4 h-4 text-zinc-400" /> {fileName}</span>
                   <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                   <span className="text-zinc-400">{metrics.count} events analyzed</span>
                 </div>
               </div>
               <div className="mt-6 md:mt-0">
                 <button onClick={() => setEvents([])} className="h-11 px-6 rounded-full bg-[#16161A] border border-white/10 hover:bg-[#202024] hover:border-white/20 text-white text-sm font-semibold transition-all shadow-lg hover:shadow-xl">
                   Analyze New File
                 </button>
               </div>
            </div>

            {/* Top KPI Row - Product Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-16">
              <KpiCard title="Total Events" value={metrics.count} icon={<BarChart3 className="w-5 h-5"/>} color="zinc" />
              <KpiCard title="Success Rate" value={`${metrics.successRate}%`} subtitle={`${events.length - metrics.errorEvents.length} filled`} icon={<CheckCircle2 className="w-5 h-5"/>} color="emerald" />
              <KpiCard title="Avg Execution" value={`${metrics.avgTotal}ms`} subtitle="End-to-end latency" icon={<Clock className="w-5 h-5"/>} color="violet" />
              <KpiCard title="Avg Synk Routing" value={`${metrics.avgSynk}ms`} subtitle="Ultra-low latency" icon={<Zap className="w-5 h-5"/>} color="cyan" />
              <KpiCard title="MT5 Bottleneck" value={`${metrics.bottleneckRate}%`} subtitle="Broker dominated" icon={<Server className="w-5 h-5"/>} color="orange" />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
              
              {/* Left Column: Timeline & Heatmap */}
              <div className="xl:col-span-2 space-y-8">
                
                {/* Pipeline Visualization (Timeline) - The Core Feature */}
                <Panel title="Execution Pipeline" subtitle="Latency flow analysis of the most recent execution">
                  <div className="px-6 py-12">
                    
                    {/* Visual Flow */}
                    <div className="relative flex items-center justify-between mb-24 px-4 md:px-8 mt-8">
                      {/* Connecting Line background */}
                      <div className="absolute left-[8%] right-[8%] h-[2px] bg-white/[0.03] top-8 -z-10 rounded-full"></div>
                      
                      <FlowNode title="Alert Rx" ms="0.0" icon={<Bell/>} color="zinc" active={true} />
                      
                      <FlowLine active={true} duration={latest?.timings?.synk_processing_ms} />
                      
                      <FlowNode title="Synk Engine" ms={latest?.timings?.synk_processing_ms || 0} icon={<Zap/>} color="cyan" active={true} />
                      
                      <FlowLine active={true} duration={latest?.timings?.mt5_send_ms} isSlow={true} />
                      
                      <FlowNode title="Broker Auth" ms={((latest?.timings?.mt5_send_ms || 0) * 0.3).toFixed(1)} icon={<Server/>} color="orange" active={true} warning={true} />
                      
                      <FlowLine active={true} duration={latest?.timings?.total_execution_ms} isSlow={true} />
                      
                      <FlowNode title="Order Filled" ms={latest?.timings?.total_execution_ms || 0} icon={<CheckCircle2/>} color="emerald" active={latest?.status === 'filled'} />
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-white/[0.04]">
                       <MetaField label="Symbol" value={latest?.symbol} />
                       <MetaField label="Action" value={`${latest?.side || '-'} ${latest?.volume || ''}`} />
                       <MetaField label="Bottleneck" value={latest?.bottleneck_stage?.replace('_', ' ')} accent="orange" />
                       <MetaField label="Status" value={latest?.status} accent={latest?.status === 'filled' ? 'emerald' : 'zinc'} />
                    </div>
                  </div>
                </Panel>

                {/* Density Heatmap */}
                <Panel title="Latency Distribution Density" subtitle="total_execution_ms mapped over recent executions">
                  <div className="h-72 mt-8 w-full flex flex-col justify-end">
                     <div className="flex items-end gap-1.5 w-full h-full pb-6">
                       {events.slice(-80).map((e, i) => {
                          const lat = e.timings?.total_execution_ms || 0;
                          // Height based on latency, capped for visual
                          const heightPct = Math.max(8, Math.min(100, (lat / 500) * 100));
                          
                          let color = 'bg-emerald-500/90 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
                          if(lat > 250) color = 'bg-orange-500/90 hover:bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]';
                          else if(lat > 100) color = 'bg-amber-500/90 hover:bg-amber-400';
                          else if(lat === 0) color = 'bg-zinc-800/60';

                          return (
                            <div key={i} className="group relative flex-1 flex justify-center h-full items-end">
                              <div 
                                className={`w-full rounded-sm transition-all duration-300 ${color}`}
                                style={{ height: `${heightPct}%` }}
                              ></div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#202024] border border-white/10 text-xs py-1.5 px-3 rounded-md font-medium text-white pointer-events-none z-10 shadow-xl">
                                {lat}ms
                              </div>
                            </div>
                          )
                       })}
                     </div>
                     <div className="flex justify-between text-[11px] text-zinc-500 font-bold uppercase tracking-widest pt-5 border-t border-white/[0.04]">
                        <span>Older</span>
                        <span>Latest Events &rarr;</span>
                     </div>
                  </div>
                </Panel>

              </div>

              {/* Right Column: Donut & Errors */}
              <div className="space-y-8 flex flex-col">
                
                {/* Donut Chart - Rebuilt using SVG for high quality */}
                <Panel title="Latency Composition" subtitle="Average execution breakdown">
                  <div className="py-10 flex flex-col items-center">
                    <div className="relative w-64 h-64 flex items-center justify-center mb-4">
                      <DonutChart synk={metrics.avgSynk} mt5={metrics.avgMt5} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-5xl font-bold text-white tracking-tighter">{metrics.avgTotal}</span>
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-2">Avg MS</span>
                      </div>
                    </div>
                    
                    <div className="w-full mt-10 space-y-4 px-6">
                      <LegendItem label="Synk Processing" value={`${metrics.avgSynk}ms`} color="bg-cyan-500" pct={((metrics.avgSynk/metrics.avgTotal)*100).toFixed(1)} />
                      <LegendItem label="MT5/Broker Transit" value={`${metrics.avgMt5}ms`} color="bg-orange-500" pct={((metrics.avgMt5/metrics.avgTotal)*100).toFixed(1)} />
                    </div>
                  </div>
                </Panel>

                {/* Error Log */}
                <Panel title="Diagnostics Log" subtitle="Rejected orders & retcodes" flex={true}>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-3 -mr-3 mt-6 custom-scrollbar h-[340px]">
                    {metrics.errorEvents.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                         <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center mb-4">
                           <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                         </div>
                         <p className="text-sm font-medium">No errors detected</p>
                       </div>
                    ) : (
                      metrics.errorEvents.map((err, i) => (
                        <div key={i} className="group p-5 rounded-2xl border border-rose-500/10 bg-gradient-to-br from-rose-500/[0.03] to-transparent hover:bg-rose-500/5 hover:border-rose-500/20 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <span className="font-bold text-zinc-200">{err.symbol}</span>
                            <span className="text-[11px] font-mono font-semibold text-zinc-400 bg-black/60 px-2.5 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors shadow-inner">
                              Code: {err.mt5?.retcode || 'UNK'}
                            </span>
                          </div>
                          <p className="text-sm text-rose-400/80 font-medium leading-relaxed">
                            {err.mt5?.comment || 'Unknown rejection reason'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Reusable High-End UI Components
// ==========================================

function Panel({ title, subtitle, children, flex }) {
  return (
    <div className={`relative rounded-[32px] border border-white/[0.06] bg-[#121214]/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden ${flex ? 'flex flex-col h-full' : ''}`}>
      {/* Subtle top glare */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className={`p-8 md:p-10 ${flex ? 'flex flex-col h-full' : ''}`}>
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          {subtitle && <p className="text-[13px] text-zinc-500 mt-1.5 font-medium">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon, color }) {
  const colorMap = {
    zinc: 'text-zinc-400 from-zinc-500/5 to-transparent border-zinc-500/20 shadow-zinc-500/5',
    emerald: 'text-emerald-400 from-emerald-500/5 to-transparent border-emerald-500/20 shadow-emerald-500/5',
    violet: 'text-violet-400 from-violet-500/5 to-transparent border-violet-500/20 shadow-violet-500/5',
    cyan: 'text-cyan-400 from-cyan-500/5 to-transparent border-cyan-500/20 shadow-cyan-500/5',
    orange: 'text-orange-400 from-orange-500/5 to-transparent border-orange-500/20 shadow-orange-500/5',
  }

  const gradient = colorMap[color];

  return (
    <div className="relative p-7 rounded-[28px] bg-[#121214] border border-white/5 shadow-xl overflow-hidden group hover:border-white/10 transition-all hover:-translate-y-0.5 duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none transition-opacity group-hover:opacity-100 ${gradient}`}></div>
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] font-bold text-zinc-500 tracking-wide uppercase">{title}</span>
          <div className={`p-2.5 rounded-xl bg-black/50 border border-white/5 shadow-inner ${gradient.split(' ')[0]}`}>
            {icon}
          </div>
        </div>
        <div className="text-4xl font-bold text-white tracking-tighter mb-2">{value}</div>
        <div className="text-[13px] font-medium text-zinc-500 truncate">{subtitle}</div>
      </div>
    </div>
  )
}

function FlowNode({ title, ms, icon, color, active, warning }) {
  const colorStyles = {
    zinc: 'bg-zinc-800/80 text-zinc-300 border-zinc-600',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]',
  }
  
  const style = active ? colorStyles[color] : 'bg-[#16161A] text-zinc-700 border-white/5';

  return (
    <div className="flex flex-col items-center relative z-10 w-24">
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 transition-all duration-700 ${style} ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <div className="text-center w-full">
        <div className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 whitespace-nowrap ${active ? 'text-zinc-300' : 'text-zinc-700'}`}>{title}</div>
        <div className={`text-sm font-mono font-semibold ${warning ? 'text-orange-400' : (active ? 'text-white' : 'text-zinc-700')}`}>
          {ms}ms
        </div>
      </div>
    </div>
  )
}

function FlowLine({ active, duration, isSlow }) {
  return (
    <div className="flex-1 px-3 -translate-y-10 relative group min-w-[50px]">
       <div className={`h-[2px] w-full rounded-full transition-all duration-1000 ${active ? (isSlow ? 'bg-gradient-to-r from-cyan-500/50 to-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]') : 'bg-transparent'}`}>
       </div>
       {active && duration > 0 && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-mono font-bold text-zinc-400 bg-[#121214] px-3 py-0.5 rounded-full border border-white/5 shadow-lg">
            +{duration}ms
          </div>
       )}
    </div>
  )
}

function MetaField({ label, value, accent }) {
  return (
    <div className="bg-black/40 border border-white/[0.04] rounded-2xl p-5 hover:bg-black/60 transition-colors">
      <div className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-sm font-semibold truncate ${accent === 'orange' ? 'text-orange-400' : (accent === 'emerald' ? 'text-emerald-400' : 'text-zinc-200')}`}>
        {value || '-'}
      </div>
    </div>
  )
}

function LegendItem({ label, value, color, pct }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-3.5">
        <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-[0_0_12px_currentColor] opacity-90`}></div>
        <span className="text-sm font-semibold text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-5">
        <span className="text-xs font-bold text-zinc-500">{pct}%</span>
        <span className="text-base font-mono font-bold text-white">{value}</span>
      </div>
    </div>
  )
}

// High Quality SVG Donut for Product-level Visualization
function DonutChart({ synk, mt5 }) {
  const size = 260;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const total = parseFloat(synk) + parseFloat(mt5);
  const synkPct = total > 0 ? parseFloat(synk) / total : 0;
  
  // Calculate dash arrays
  const synkDash = synkPct * circumference;
  const mt5Dash = circumference - synkDash;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 filter drop-shadow-2xl">
      {/* Track Background */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1A1A20"
        strokeWidth={strokeWidth}
      />
      {/* MT5 Segment (Orange - Bottleneck) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f97316"
        strokeWidth={strokeWidth}
        strokeDasharray={`${mt5Dash} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
      {/* Synk Segment (Cyan - Ultra Fast) */}
      {synkDash > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={strokeWidth}
          strokeDasharray={`${synkDash} ${circumference}`}
          strokeDashoffset={-mt5Dash}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      )}
    </svg>
  );
}
