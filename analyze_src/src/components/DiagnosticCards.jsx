import React from 'react';
import { Activity, Zap, Server, Monitor, AlertTriangle, CheckCircle2, ChevronUp, ShieldCheck } from 'lucide-react';

const PrimaryCard = ({ title, value, subtext }) => {
  const isHealthy = value === 'System Healthy (No obvious bottleneck)';
  const isWarning = value !== 'Insufficient evidence' && !isHealthy;
  
  return (
    <div className={`col-span-2 md:col-span-4 lg:col-span-3 bg-[#111922] border ${isWarning ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-cyan-500/30'} rounded-[3px] p-5 flex flex-col relative overflow-hidden`}>
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600 opacity-50"></div>
      {isWarning && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-600 opacity-80"></div>}
      
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
      <div className={`text-3xl font-mono font-bold tracking-tight mb-2 ${isWarning ? 'text-amber-400' : 'text-slate-100'}`}>
        {value}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-auto pt-3 border-t border-[rgba(148,163,184,0.1)]">
        {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" /> : 
         isWarning ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80" /> : 
         <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
        {subtext}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, median, count, isError }) => (
  <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-4 flex flex-col shadow-sm hover:border-[rgba(148,163,184,0.3)] transition-colors">
    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
    <div className="flex items-baseline gap-1">
      <span className={`text-2xl font-mono font-semibold tracking-tight ${isError && value !== 0 ? 'text-red-400' : 'text-slate-200'}`}>
        {value}
      </span>
      {unit && value !== 'n/a' && <span className="text-xs text-slate-500 font-mono">{unit}</span>}
    </div>
    
    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-auto pt-2 border-t border-[rgba(148,163,184,0.1)]">
      <span>{median !== undefined ? `Median: ${median}` : 'Data Source'}</span>
      {count !== undefined && <span className="text-cyan-500/50">C: {count}</span>}
    </div>
  </div>
);

export default function DiagnosticCards({ stats, bottleneck, counts, errors }) {
  // If no data loaded, pass defaults
  const isLoaded = stats && counts > 0;
  
  const getValue = (layerStat) => isLoaded && layerStat.p95 !== 'n/a' ? layerStat.p95 : 'n/a';
  const getMedian = (layerStat) => isLoaded && layerStat.median !== 'n/a' ? layerStat.median : 'n/a';

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-4 p-5 bg-[#0b1117] shrink-0">
      <PrimaryCard 
        title="Primary Bottleneck" 
        value={isLoaded ? bottleneck : 'Waiting for JSONL'} 
        subtext={isLoaded ? "Determined by comparing p95 median latencies across all layers" : "Drop a log file to begin analysis"}
      />
      
      <MetricCard 
        title="MT5 Execution p95" 
        value={isLoaded ? getValue(stats.mt5Execution) : 'n/a'}
        unit="ms"
        median={isLoaded ? getMedian(stats.mt5Execution) : '-'}
        count={isLoaded ? stats.mt5Execution.count : '-'}
      />
      
      <MetricCard 
        title="WS Transport p95" 
        value={isLoaded ? getValue(stats.wsTransport) : 'n/a'}
        unit="ms"
        median={isLoaded ? getMedian(stats.wsTransport) : '-'}
        count={isLoaded ? stats.wsTransport.count : '-'}
      />
      
      <MetricCard 
        title="UI Render p95" 
        value={isLoaded ? getValue(stats.render) : 'n/a'}
        unit="ms"
        median={isLoaded ? getMedian(stats.render) : '-'}
        count={isLoaded ? stats.render.count : '-'}
      />
      
      <MetricCard 
        title="Status Build p95" 
        value={isLoaded ? getValue(stats.statusBuild) : 'n/a'}
        unit="ms"
        median={isLoaded ? getMedian(stats.statusBuild) : '-'}
        count={isLoaded ? stats.statusBuild.count : '-'}
      />

      <MetricCard 
        title="Total Events" 
        value={isLoaded ? counts : 0}
        median="All parsed rows"
      />
    </div>
  );
}
