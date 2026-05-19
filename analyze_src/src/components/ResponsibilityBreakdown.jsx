import React, { useMemo } from 'react';

const BoundaryPanel = ({ title, data }) => (
  <div className="flex-1 flex flex-col min-w-[220px]">
    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-[rgba(148,163,184,0.1)] pb-1">
      {title}
    </h4>
    <div className="flex flex-col gap-1 font-mono text-[10px] flex-1">
      {Object.entries(data).map(([k, v]) => {
        const isUnknown = v === undefined || v === null || v === '' || v === 'Unknown' || v === 'n/a';
        return (
          <div key={k} className="flex items-center justify-between group py-0.5">
            <span className="text-slate-500 group-hover:text-slate-400 transition-colors truncate pr-2">{k}</span>
            <span className={isUnknown ? 'text-slate-600/30' : 'text-slate-300 font-semibold truncate max-w-[140px] text-right'} title={String(v)}>
              {isUnknown ? 'n/a' : String(v)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export default function ResponsibilityBreakdown({ events }) {
  const breakdown = useMemo(() => {
    const account = {
      login: 'n/a',
      server: 'n/a',
      company: 'n/a',
      currency: 'n/a',
      leverage: 'n/a',
      trade_mode: 'n/a',
      margin_mode: 'n/a',
      trade_allowed: 'n/a',
      trade_expert: 'n/a'
    };
    
    const terminal = {
      name: 'n/a',
      build: 'n/a',
      connected: 'n/a',
      trade_allowed: 'n/a',
      tradeapi_disabled: 'n/a',
      ping_last: 'n/a',
      retransmission: 'n/a',
      multi_mt5: 'n/a'
    };
    
    const symbol = {
      req_symbol: 'n/a',
      res_symbol: 'n/a',
      spread: 'n/a',
      trade_mode: 'n/a',
      execution: 'n/a',
      filling: 'n/a',
      stops_level: 'n/a',
      freeze_level: 'n/a',
      vol_min: 'n/a',
      vol_max: 'n/a',
      vol_step: 'n/a',
      currency_base: 'n/a',
      currency_profit: 'n/a',
      currency_margin: 'n/a'
    };

    if (events && events.length > 0) {
      events.forEach(ev => {
        if (ev.event === 'ACCOUNT_SNAPSHOT' && ev.payload) {
          const p = ev.payload;
          if (p.login_masked) account.login = p.login_masked;
          else if (p.login) account.login = p.login;
          
          if (p.server) account.server = p.server;
          if (p.company) account.company = p.company;
          if (p.currency) account.currency = p.currency;
          if (p.leverage !== undefined) account.leverage = p.leverage;
          if (p.trade_mode !== undefined) account.trade_mode = p.trade_mode;
          if (p.margin_mode !== undefined) account.margin_mode = p.margin_mode;
          if (p.trade_allowed !== undefined) account.trade_allowed = p.trade_allowed;
          if (p.trade_expert !== undefined) account.trade_expert = p.trade_expert;
        }

        if (ev.event === 'TERMINAL_SNAPSHOT' && ev.payload) {
          const p = ev.payload;
          if (p.name) terminal.name = p.name;
          if (p.build !== undefined) terminal.build = p.build;
          if (p.connected !== undefined) terminal.connected = p.connected;
          if (p.trade_allowed !== undefined) terminal.trade_allowed = p.trade_allowed;
          if (p.tradeapi_disabled !== undefined) terminal.tradeapi_disabled = p.tradeapi_disabled;
          if (p.ping_last !== undefined) terminal.ping_last = p.ping_last;
          if (p.retransmission !== undefined) terminal.retransmission = p.retransmission;
          if (p.multi_mt5 !== undefined) terminal.multi_mt5 = p.multi_mt5;
        }

        if (ev.event === 'SYMBOL_SNAPSHOT' && ev.payload) {
          const p = ev.payload;
          if (p.requested_symbol) symbol.req_symbol = p.requested_symbol;
          if (p.symbol) symbol.res_symbol = p.symbol;
          if (p.spread !== undefined) symbol.spread = p.spread;
          if (p.trade_mode !== undefined) symbol.trade_mode = p.trade_mode;
          if (p.execution_mode) symbol.execution = p.execution_mode;
          if (p.filling_mode) symbol.filling = p.filling_mode;
          if (p.trade_stops_level !== undefined) symbol.stops_level = p.trade_stops_level;
          if (p.trade_freeze_level !== undefined) symbol.freeze_level = p.trade_freeze_level;
          if (p.volume_min !== undefined) symbol.vol_min = p.volume_min;
          if (p.volume_max !== undefined) symbol.vol_max = p.volume_max;
          if (p.volume_step !== undefined) symbol.vol_step = p.volume_step;
          if (p.currency_base) symbol.currency_base = p.currency_base;
          if (p.currency_profit) symbol.currency_profit = p.currency_profit;
          if (p.currency_margin) symbol.currency_margin = p.currency_margin;
        }
      });
    }

    return { account, terminal, symbol };
  }, [events]);

  return (
    <div className="flex-[3] bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] p-5 shadow-sm flex flex-col">
       <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-[rgba(148,163,184,0.15)] pb-3">
        Environment Boundaries
      </h3>
      <div className="flex flex-row flex-wrap gap-8 h-full">
        <BoundaryPanel title="Account Boundary" data={breakdown.account} />
        <BoundaryPanel title="Terminal Boundary" data={breakdown.terminal} />
        <BoundaryPanel title="Symbol Boundary" data={breakdown.symbol} />
      </div>
    </div>
  );
}
