import React, { useMemo } from 'react';

const LayerPanel = ({ title, data }) => (
  <div className="flex-1 bg-[#121214] border border-[#27272A] rounded-[3px] p-4">
    <h3 className="text-xs font-semibold text-[#F1F5F9] uppercase tracking-widest mb-4 border-b border-[#27272A] pb-2">
      {title}
    </h3>
    <div className="flex flex-col gap-2 font-mono text-xs">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-center justify-between">
          <span className="text-[#52525B]">{k}:</span>
          <span className="text-[#E2E8F0]">{v !== undefined && v !== null && v !== '' ? String(v) : 'Unknown'}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function ResponsibilityBreakdown({ events }) {
  const breakdown = useMemo(() => {
    const sm = {
      command: 'n/a',
      local_server: 'n/a',
      websocket: 'n/a',
      render: 'n/a'
    };
    
    const mt5 = {
      order_send: 'n/a',
      positions_get: 'n/a',
      orders_get: 'n/a',
      close_loop: 'n/a'
    };
    
    const broker = {
      broker: 'Unknown',
      server: 'Unknown',
      symbol: 'Unknown',
      spread: 'Unknown',
      freeze_level: 'Unknown',
      stops_level: 'Unknown',
      execution_mode: 'Unknown',
      filling_mode: 'Unknown',
      volume_step: 'Unknown'
    };

    // Extract static snapshot data
    events.forEach(ev => {
      if (ev.event === 'ACCOUNT_SNAPSHOT' && ev.payload) {
        if (ev.payload.company) broker.broker = ev.payload.company;
        if (ev.payload.server) broker.server = ev.payload.server;
      }
      if (ev.event === 'SYMBOL_SNAPSHOT' && ev.payload) {
        if (ev.payload.symbol) broker.symbol = ev.payload.symbol;
        if (ev.payload.spread !== undefined) broker.spread = ev.payload.spread;
        if (ev.payload.freeze_level !== undefined) broker.freeze_level = ev.payload.freeze_level;
        if (ev.payload.stops_level !== undefined) broker.stops_level = ev.payload.stops_level;
        if (ev.payload.execution_mode) broker.execution_mode = ev.payload.execution_mode;
        if (ev.payload.filling_mode) broker.filling_mode = ev.payload.filling_mode;
        if (ev.payload.volume_step !== undefined) broker.volume_step = ev.payload.volume_step;
      }
    });

    return { sm, mt5, broker };
  }, [events]);

  return (
    <div className="p-4 bg-[#09090B]">
      <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">Responsibility Breakdown</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <LayerPanel title="Synk Mushroom Layer" data={breakdown.sm} />
        <LayerPanel title="MT5 Execution Layer" data={breakdown.mt5} />
        <LayerPanel title="Broker / Symbol Layer" data={breakdown.broker} />
      </div>
    </div>
  );
}
