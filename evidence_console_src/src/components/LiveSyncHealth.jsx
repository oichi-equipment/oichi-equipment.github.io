import { Activity, Radio, Zap } from 'lucide-react';

const SyncCard = ({ title, mainLabel, mainValue, mainUnit, icon: Icon, children }) => {
  return (
    <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-4 flex flex-col shadow-sm transition-colors select-none h-full">
      <div className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-start gap-1.5 h-[28px]">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#a1a1aa] mt-0.5 shrink-0" />}
        <span className="leading-tight line-clamp-1">{title}</span>
      </div>
      
      <div className="flex flex-col mb-4">
        <div className="text-[11px] font-sans text-[#a1a1aa] mb-0.5 uppercase tracking-widest">{mainLabel}</div>
        <div className="flex items-baseline gap-0.5 h-[28px]">
          <span className="text-[28px] font-mono font-bold tracking-tight leading-none text-[#f3f4f6]">
            {mainValue}
          </span>
          {mainUnit && mainValue !== 'n/a' && <span className="text-[14px] text-[#a1a1aa] font-mono ml-0.5">{mainUnit}</span>}
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 text-[12px] font-mono text-[#a1a1aa] mt-auto border-t border-[#2d2d2d]/60 pt-3">
        {children}
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }) => (
  <div className="flex justify-between items-baseline gap-2">
    <span className="text-text-sub font-sans">{label}</span>
    <span className="font-bold text-[#d4d4d8]">{value}</span>
  </div>
);

export default function LiveSyncHealth({ quoteStats, profitStats, closeStats }) {
  if (!quoteStats || !profitStats || !closeStats) return null;

  const formatVal = (val) => val === undefined || val === null ? 'n/a' : val;
  const formatMs = (val) => val === 'n/a' || val === undefined || val === null ? 'n/a' : `${val} ms`;

  const qMedian = formatVal(quoteStats.intervalStats?.median);
  const qP95 = formatMs(quoteStats.intervalStats?.p95);
  const qTransport = formatMs(quoteStats.transportStats?.p95);

  const pMedian = formatVal(profitStats.intervalStats?.median);
  const pP95 = formatMs(profitStats.intervalStats?.p95);
  const pTransport = formatMs(profitStats.transportStats?.p95);

  const cP95 = formatVal(closeStats.mt5ToCommandResultStats?.p95);
  const cMedian = formatMs(closeStats.mt5ToCommandResultStats?.median);
  const cTransport = formatMs(closeStats.commandResultTransportStats?.p95);

  return (
    <div className="px-5 pt-5 pb-0 shrink-0 flex flex-col gap-4">
      <div className="flex flex-col">
        <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Radio className="w-4 h-4 text-uguisu-light" />
          Live Sync Health
        </h3>
        <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
          Observed live sync timing for quote feed, MT5 profit, and close-result notifications.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        <SyncCard 
          title="Quote Sync" 
          mainLabel="Quote interval (median)"
          mainValue={qMedian}
          mainUnit="ms"
          icon={Activity}
        >
          <MetricRow label="95% under this value" value={qP95} />
          <MetricRow label="WS transport (95%)" value={qTransport} />
          <MetricRow label="MT5 API busy" value={`${quoteStats.busyRate || 0}%`} />
          <MetricRow label="UI receives" value={`${quoteStats.wsReceiveCount} / ${quoteStats.messageCount}`} />
          <MetricRow label="Server sends" value={quoteStats.serverSendCount} />
          <MetricRow label="Build samples" value={quoteStats.buildMetricsCount} />
        </SyncCard>

        <SyncCard 
          title="Profit Sync" 
          mainLabel="Profit interval (median)"
          mainValue={pMedian}
          mainUnit="ms"
          icon={Activity}
        >
          <MetricRow label="95% under this value" value={pP95} />
          <MetricRow label="WS transport (95%)" value={pTransport} />
          <MetricRow label="P/L updates" value={profitStats.totalProfitUpdates} />
          <MetricRow label="UI receives" value={`${profitStats.wsReceiveCount} / ${profitStats.messageCount}`} />
          <MetricRow label="Server sends" value={profitStats.serverSendCount} />
          <MetricRow label="Build samples" value={profitStats.buildMetricsCount} />
        </SyncCard>

        <SyncCard 
          title="Close Result Sync" 
          mainLabel="Close dispatch (95% under)"
          mainValue={cP95}
          mainUnit="ms"
          icon={Zap}
        >
          <MetricRow label="Typical (median)" value={cMedian} />
          <MetricRow label="WS transport (95%)" value={cTransport} />
          <MetricRow label="Close all" value={closeStats.closeAllCount} />
          <MetricRow label="Close position" value={closeStats.closePositionCount} />
          <MetricRow label="Missing tickets" value={closeStats.missingTicketCount} />
          <MetricRow label="Missing correlation" value={closeStats.missingCorrelationIdCount} />
        </SyncCard>

      </div>
    </div>
  );
}
