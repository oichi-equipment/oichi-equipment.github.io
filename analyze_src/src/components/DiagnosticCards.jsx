import { Activity, Clock, ShieldCheck, AlertTriangle, Play, HelpCircle, Flame, Tag } from 'lucide-react';

const PrimaryCard = ({ title, value, subtext }) => {
  const isHealthy = value === 'System Healthy (No obvious bottleneck)';
  const isWarning = value !== 'Insufficient evidence' && !isHealthy && value !== 'Waiting for JSONL';
  
  return (
    <div className={`col-span-1 sm:col-span-2 lg:col-span-2 bg-dark-card border ${
      isWarning 
        ? 'border-gold-warning-border bg-gold-warning-bg/40 shadow-[0_0_15px_rgba(184,134,43,0.03)]' 
        : isHealthy 
          ? 'border-uguisu/40 shadow-[0_0_15px_rgba(82,102,44,0.04)]' 
          : 'border-dark-border'
    } rounded-[3px] p-4 flex flex-col relative overflow-hidden transition-all select-none`}>
      
      <div className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-gold-warning-light animate-pulse' : 'bg-uguisu-light'}`} />
        {title}
      </div>
      <div className={`text-[30px] font-sans font-bold tracking-tight mb-2 leading-tight ${
        isWarning ? 'text-gold-warning-light' : isHealthy ? 'text-uguisu-light' : 'text-text-main'
      }`}>
        {value}
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-text-muted font-sans mt-auto pt-2 border-t border-dark-border/40">
        {isHealthy ? <ShieldCheck className="w-4 h-4 text-uguisu-light" /> : 
         isWarning ? <AlertTriangle className="w-4 h-4 text-gold-warning-light" /> : 
         <HelpCircle className="w-4 h-4 text-text-muted" />}
        <span className="truncate">{subtext}</span>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, median, count, isError, icon: Icon }) => (
  <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm hover:border-dark-border transition-colors select-none">
    <div className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-text-muted" />}
      {title}
    </div>
    <div className="flex items-baseline gap-0.5">
      <span className={`text-[24px] font-mono font-bold tracking-tight ${isError ? 'text-enji-light' : 'text-text-main'}`}>
        {value}
      </span>
      {unit && value !== 'n/a' && <span className="text-[12px] text-text-muted font-mono ml-0.5">{unit}</span>}
    </div>
    
    <div className="flex justify-between items-center text-[12px] text-text-muted font-sans mt-auto pt-2 border-t border-dark-border/40 font-medium">
      <span className="truncate">{median !== undefined ? `Median: ${median}` : 'Data Source'}</span>
      {count !== undefined && <span className="text-text-sub font-mono">C: {count}</span>}
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 select-none">
      
      {/* Primary Bottleneck Card */}
      <PrimaryCard 
        title="Primary Bottleneck" 
        value={isLoaded ? bottleneck : 'Waiting for JSONL'} 
        subtext={isLoaded ? "Aggregated latencies comparison" : "Upload logs to initiate diagnostics"}
      />
      
      {/* MT5 Execution Latency Card */}
      <MetricCard 
        title="MT5 Execution p95" 
        value={isLoaded ? getMt5P95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getMt5Median() : '-'}
        count={isLoaded ? stats.mt5Execution.count : undefined}
        icon={Activity}
      />
      
      {/* Total Observed Latency Card */}
      <MetricCard 
        title="Total Duration p95" 
        value={isLoaded ? getObsP95() : 'n/a'}
        unit="ms"
        median={isLoaded ? getObsMedian() : '-'}
        count={isLoaded ? totalObservedStats.count : undefined}
        icon={Clock}
      />
      
      {/* Executed / Failed Card */}
      <MetricCard 
        title="Executed / Failed" 
        value={isLoaded ? `${totalExecuted} / ${totalFailed}` : '0 / 0'}
        isError={isLoaded && totalFailed > 0}
        median="Trade commands"
        icon={Play}
      />
      
      {/* Slowest Command Card */}
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm hover:border-dark-border transition-colors">
        <div className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-text-muted" />
          Slowest Command
        </div>
        {isLoaded && slowestCommand ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-sans font-bold text-text-main truncate" title={slowestCommand.action}>
              {slowestCommand.action}
            </span>
            <span className="text-[13px] font-mono font-bold text-gold-warning-light">
              {slowestCommand.latencies.mt5Execution} <span className="text-[10px] text-text-muted font-mono">ms</span>
            </span>
          </div>
        ) : (
          <span className="text-[20px] font-mono font-bold text-text-muted">n/a</span>
        )}
        <div className="text-[12px] text-text-muted font-sans mt-auto pt-2 border-t border-dark-border/40 font-medium">
          Core MT5 execution
        </div>
      </div>

      {/* Retcode Status Card */}
      <div className="bg-dark-card border border-dark-border rounded-[3px] p-4 flex flex-col shadow-sm hover:border-dark-border transition-colors">
        <div className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-text-muted" />
          Retcode Status
        </div>
        
        {isLoaded && retcodeSummary && retcodeSummary.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-h-[36px] overflow-y-auto pr-0.5">
            {retcodeSummary.map(r => {
              const isSuccess = r.retcode === 10009 || r.retcode === 0;
              const isFail = r.retcode !== 'n/a' && !isSuccess;
              const badgeClass = isSuccess 
                ? 'bg-dark-base text-uguisu-light border border-uguisu/30' 
                : isFail
                  ? 'bg-dark-base text-enji-light border border-enji/30'
                  : 'bg-dark-base text-text-sub border border-dark-border';
                  
              return (
                <span 
                  key={`${r.retcode}_${r.comment}`}
                  className={`px-1.5 py-0.5 rounded-[1px] text-[10px] font-mono font-bold tracking-tight leading-none ${badgeClass}`}
                  title={`${r.retcode}: ${r.comment} (${r.count} times)`}
                >
                  {r.retcode}:{r.count}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-[20px] font-mono font-bold text-text-muted">n/a</span>
        )}
        
        <div className="text-[12px] text-text-muted font-sans mt-auto pt-2 border-t border-dark-border/40 font-medium">
          Distribution summary
        </div>
      </div>

    </div>
  );
}
