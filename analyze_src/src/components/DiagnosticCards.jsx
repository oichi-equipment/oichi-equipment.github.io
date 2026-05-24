import { Activity, Clock, ShieldCheck, AlertTriangle, Play, HelpCircle, Flame, Tag, Server, Monitor } from 'lucide-react';

const PrimaryCard = ({ title, value, subtext }) => {
  const isHealthy = value === 'System Healthy (No obvious bottleneck)';
  const isWarning = value !== 'Insufficient evidence' && !isHealthy && value !== 'Waiting for JSONL';
  const displayValue = isHealthy ? 'None (Distributed)' : (typeof value === 'string' ? value.replace(' Layer', '') : value);
  
  return (
    <div className={`col-span-1 sm:col-span-2 lg:col-span-2 bg-[#111111] border ${
      isWarning 
        ? 'border-[#8c6b23]/50 bg-[#2a1f10]/30 shadow-[0_0_15px_rgba(184,134,43,0.03)]' 
        : isHealthy 
          ? 'border-[#2d2d2d] shadow-sm' 
          : 'border-[#2d2d2d]'
    } rounded-[3px] p-4 flex flex-col h-full relative overflow-hidden transition-all select-none`}>
      
      <div className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-start gap-1.5 h-[32px]">
        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${isWarning ? 'bg-[#d4af37] animate-pulse' : 'bg-[#52662c]'}`} />
        <span className="leading-tight line-clamp-2" title={title}>{title}</span>
      </div>
      
      <div className={`text-[32px] font-sans font-bold tracking-tight mb-2 leading-none h-[28px] ${
        isWarning ? 'text-[#d4af37]' : 'text-[#f3f4f6]'
      }`}>
        <span className="truncate block" title={displayValue}>{displayValue}</span>
      </div>
      
      <div className="h-[34px] mb-3 flex flex-col justify-end"></div>
      
      <div className="flex items-start gap-1.5 text-[12px] text-[#a1a1aa] font-sans mt-auto pt-3 border-t border-[#2d2d2d]/60 min-h-[44px]">
        {isHealthy ? <ShieldCheck className="w-4 h-4 mt-0.5 text-[#a1a1aa] shrink-0" /> : 
         isWarning ? <AlertTriangle className="w-4 h-4 mt-0.5 text-[#d4af37] shrink-0" /> : 
         <HelpCircle className="w-4 h-4 mt-0.5 text-[#a1a1aa] shrink-0" />}
        <span className="leading-snug line-clamp-2">{subtext}</span>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, median, count, isError, icon: Icon, subtext }) => (
  <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-4 flex flex-col shadow-sm transition-colors select-none h-full">
    <div className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-start gap-1.5 h-[32px]">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#a1a1aa] mt-0.5 shrink-0" />}
      <span className="leading-tight line-clamp-2" title={title}>{title}</span>
    </div>
    
    <div className="flex items-baseline gap-0.5 mb-2 h-[28px]">
      <span className={`text-[28px] font-mono font-bold tracking-tight leading-none ${isError ? 'text-[#cc4444]' : 'text-[#f3f4f6]'}`}>
        {value}
      </span>
      {unit && value !== 'n/a' && <span className="text-[14px] text-[#a1a1aa] font-mono ml-0.5">{unit}</span>}
    </div>
    
    <div className="text-[12px] font-sans text-[#a1a1aa] font-medium flex flex-col gap-0.5 h-[34px] mb-3 justify-end">
      {(median !== undefined || count !== undefined) ? (
        <>
          {median !== undefined && median !== '-' && median !== 'n/a' && <span>Typical {median} ms</span>}
          {count !== undefined && <span>samples {count}</span>}
        </>
      ) : null}
    </div>
    
    <div className="flex items-start text-[12px] text-[#a1a1aa] font-sans mt-auto pt-3 border-t border-[#2d2d2d]/60 font-medium min-h-[44px]">
      <span className="leading-snug line-clamp-2">{subtext}</span>
    </div>
  </div>
);

export default function DiagnosticCards({ 
  stats, 
  bottleneck, 
  counts, 
  totalObservedStats,
  totalExecuted,
  totalFailed,
  slowestCommand,
  retcodeSummary
}) {
  const isLoaded = stats && counts > 0;
  
  const getObsP95 = () => isLoaded && totalObservedStats && totalObservedStats.p95 !== 'n/a' ? totalObservedStats.p95 : 'n/a';
  const getObsMedian = () => isLoaded && totalObservedStats && totalObservedStats.median !== 'n/a' ? totalObservedStats.median : 'n/a';

  const getMt5P95 = () => isLoaded && stats.mt5Execution.p95 !== 'n/a' ? stats.mt5Execution.p95 : 'n/a';
  const getMt5Median = () => isLoaded && stats.mt5Execution.median !== 'n/a' ? stats.mt5Execution.median : 'n/a';

  const getSmP95 = () => isLoaded && stats.coreExecution && stats.coreExecution.p95 !== 'n/a' ? stats.coreExecution.p95 : 'n/a';
  const getSmMedian = () => isLoaded && stats.coreExecution && stats.coreExecution.median !== 'n/a' ? stats.coreExecution.median : '-';

  const getPostP95 = () => isLoaded && stats.postExecution && stats.postExecution.p95 !== 'n/a' ? stats.postExecution.p95 : 'n/a';
  const getPostMedian = () => isLoaded && stats.postExecution && stats.postExecution.median !== 'n/a' ? stats.postExecution.median : '-';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3 select-none">
      
      {/* Primary Bottleneck Card */}
      <PrimaryCard 
        title="Dominant Observed Layer" 
        value={isLoaded ? bottleneck : 'Waiting for JSONL'} 
        subtext={isLoaded ? "Observed latency concentration, not responsibility." : "Upload logs to initiate diagnostics"}
      />
      
      {/* MT5 Execution Latency Card */}
      <MetricCard 
        title="MT5 Response Time" 
        value={isLoaded ? getMt5P95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getMt5Median() : undefined}
        count={isLoaded ? stats.mt5Execution.count : undefined}
        icon={Activity}
        subtext="MT5 request → response / 95% under this value"
      />

      {/* SM Local Latency Card */}
      <MetricCard 
        title="Local Processing" 
        value={isLoaded ? getSmP95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getSmMedian() : undefined}
        count={isLoaded && stats.coreExecution ? stats.coreExecution.count : undefined}
        icon={Server}
        subtext="Synk Mushroom local command handling / 95% under this value"
      />

      {/* Post-UI Reflection Card */}
      <MetricCard 
        title="Post-UI Reflection" 
        value={isLoaded ? getPostP95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getPostMedian() : undefined}
        count={isLoaded && stats.postExecution ? stats.postExecution.count : undefined}
        icon={Monitor}
        subtext="After MT5 response → UI callback / 95% under this value"
      />
      
      {/* Total Observed Latency Card */}
      <MetricCard 
        title="Total Observed" 
        value={isLoaded ? getObsP95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getObsMedian() : undefined}
        count={isLoaded ? totalObservedStats.count : undefined}
        icon={Clock}
        subtext="First event → final observed event / 95% under this value"
      />
      
      {/* Executed / Failed Card */}
      <MetricCard 
        title="Executed / Failed" 
        value={isLoaded ? `${totalExecuted} / ${totalFailed}` : '0 / 0'}
        isError={isLoaded && totalFailed > 0}
        icon={Play}
        subtext="Completed trade command chains"
      />
      
      {/* Slowest Command Card */}
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-4 flex flex-col h-full shadow-sm transition-colors select-none">
        <div className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-start gap-1.5 h-[32px]">
          <Flame className="w-3.5 h-3.5 text-[#a1a1aa] mt-0.5 shrink-0" />
          <span className="leading-tight line-clamp-2">Slowest MT5 Segment</span>
        </div>
        
        <div className="flex flex-col mb-3">
          {isLoaded && slowestCommand ? (
            <>
              <div className="h-[28px] mb-2 flex items-baseline gap-0.5">
                <span className="text-[28px] font-mono font-bold tracking-tight leading-none text-[#d4af37]">
                  {slowestCommand.latencies.mt5Execution}
                </span>
                <span className="text-[14px] text-[#a1a1aa] font-mono ml-0.5">ms</span>
              </div>
              <div className="h-[34px] flex flex-col justify-end text-[13px] font-sans font-bold text-[#f3f4f6]">
                <span className="truncate" title={slowestCommand.action}>{slowestCommand.action}</span>
              </div>
            </>
          ) : (
            <>
              <div className="h-[28px] mb-2 flex items-baseline">
                <span className="text-[28px] font-mono font-bold tracking-tight leading-none text-[#a1a1aa]">n/a</span>
              </div>
              <div className="h-[34px] flex flex-col justify-end"></div>
            </>
          )}
        </div>
        
        <div className="flex items-start text-[12px] text-[#a1a1aa] font-sans mt-auto pt-3 border-t border-[#2d2d2d]/60 font-medium min-h-[44px]">
          <span className="leading-snug line-clamp-2">Measured by MT5 execution segment</span>
        </div>
      </div>

      {/* Retcode Status Card */}
      <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-4 flex flex-col h-full shadow-sm transition-colors select-none">
        <div className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-start gap-1.5 h-[32px]">
          <Tag className="w-3.5 h-3.5 text-[#a1a1aa] mt-0.5 shrink-0" />
          <span className="leading-tight line-clamp-2">MT5 Result Codes</span>
        </div>
        
        <div className="h-[64px] mb-3 flex flex-col overflow-hidden relative">
          {isLoaded && retcodeSummary && retcodeSummary.length > 0 ? (
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 h-full">
              {retcodeSummary.map(r => {
                const isSuccess = r.retcode === 10009 || r.retcode === 0;
                const isFail = r.retcode !== 'n/a' && !isSuccess;
                const colorClass = isSuccess ? 'text-[#8ba36b]' : isFail ? 'text-[#cc4444]' : 'text-[#a1a1aa]';
                    
                return (
                  <div key={`${r.retcode}_${r.comment}`} className="flex items-baseline justify-between gap-2 shrink-0">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className={`text-[13px] font-mono font-bold ${colorClass}`}>{r.retcode}</span>
                      <span className="text-[12px] font-sans text-[#a1a1aa] truncate" title={r.comment}>{r.comment || 'Unknown'}</span>
                    </div>
                    <span className={`text-[12px] font-mono font-bold ${colorClass}`}>×{r.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-[28px] font-mono font-bold tracking-tight leading-none text-[#a1a1aa]">n/a</span>
          )}
        </div>
        
        <div className="flex items-start text-[12px] text-[#a1a1aa] font-sans mt-auto pt-3 border-t border-[#2d2d2d]/60 font-medium min-h-[44px]">
          <span className="leading-snug line-clamp-2">Command execution result codes</span>
        </div>
      </div>

    </div>
  );
}
