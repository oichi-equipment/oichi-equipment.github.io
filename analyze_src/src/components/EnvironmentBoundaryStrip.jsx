import { useState, useMemo } from 'react';
import { User, Cpu, Target, Sliders, ChevronDown, ChevronUp, Database } from 'lucide-react';

const BoundaryPanel = ({ title, data }) => (
  <div className="flex-1 flex flex-col min-w-[200px] bg-dark-surface border border-dark-border rounded-[3px] p-4">
    <h4 className="text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider mb-2.5 border-b border-dark-border pb-2 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-uguisu-light" />
      {title}
    </h4>
    <div className="flex flex-col gap-1.5 font-sans text-[12px] flex-1">
      {Object.entries(data).map(([k, v]) => {
        const isUnknown = v === undefined || v === null || v === '' || v === 'Unknown' || v === 'n/a';
        return (
          <div key={k} className="flex items-center justify-between group py-1 border-b border-dark-border/20 last:border-0">
            <span className="text-text-muted group-hover:text-text-sub transition-colors truncate pr-2">{k}</span>
            <span className={isUnknown ? 'text-text-muted font-light font-sans' : 'text-text-main font-semibold font-mono truncate max-w-[140px] text-right'} title={String(v)}>
              {isUnknown ? 'n/a' : String(v)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export default function EnvironmentBoundaryStrip({ events, fileName }) {
  const [isOpen, setIsOpen] = useState(false);

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
          const sym = p.resolved_symbol || ev.symbol || p.requested_symbol;
          if (sym) symbol.res_symbol = sym;
          if (p.spread !== undefined) symbol.spread = p.spread;
          if (p.trade_mode !== undefined) symbol.trade_mode = p.trade_mode;
          if (p.trade_exemode !== undefined) symbol.execution = p.trade_exemode;
          if (p.filling_mode !== undefined) symbol.filling = p.filling_mode;
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

  if (!events || events.length === 0) return null;

  const resolvedSymbol = isVal(breakdown.symbol.res_symbol) ? breakdown.symbol.res_symbol : breakdown.symbol.req_symbol;
  
  const hasData = isVal(breakdown.account.login) || 
                  isVal(breakdown.account.company) || 
                  isVal(breakdown.terminal.name) || 
                  isVal(resolvedSymbol);

  return (
    <div className="mx-5 mt-5 mb-5 bg-[#111111] border border-[#3a3a3a] rounded-[6px] shadow-lg flex flex-col shrink-0">
      {/* Top Header Row */}
      <div className="px-5 py-3 flex justify-between items-center border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#888888]" />
          <span className="text-[14px] font-sans font-bold text-white tracking-wide uppercase">
            Session / Environment Context
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#888888] text-[11px] font-mono hidden sm:inline-block" title="Debug Info">
            events: {events.length}
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-sans font-bold border border-[#333333] text-[#aaaaaa] hover:text-white bg-[#181818] hover:bg-[#252525] transition-colors rounded-[3px]"
          >
            {isOpen ? 'Hide Details' : 'Show Details'}
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex flex-col gap-6 bg-[#0d0d0d] rounded-b-[6px]">
        {hasData ? (
          <>
            {/* 1st Row: Primary Context (Large) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PrimaryItem label="Log File" value={fileName} />
              <PrimaryItem label="Broker / Company" value={breakdown.account.company} />
              <PrimaryItem label="Server" value={breakdown.account.server} />
              <PrimaryItem label="Symbol" value={resolvedSymbol} />
            </div>

            {/* 2nd Row: Account / Terminal (Medium) */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-4 border-t border-[#1f1f1f]">
              <MediumItem label="Account" value={breakdown.account.login} />
              <MediumItem label="Terminal" value={breakdown.terminal.name} />
              <MediumItem label="Build" value={breakdown.terminal.build} />
              <MediumItem label="Currency" value={breakdown.account.currency} />
              <MediumItem label="Leverage" value={isVal(breakdown.account.leverage) ? `1:${breakdown.account.leverage}` : null} />
            </div>

            {/* 3rd Row: Trade Conditions (Small) */}
            <div className="flex flex-wrap gap-x-3 gap-y-3 pt-4 border-t border-[#1f1f1f]">
              <SmallItem label="Spread" value={isVal(breakdown.symbol.spread) ? `${breakdown.symbol.spread} pts` : null} />
              <SmallItem label="Stops" value={isVal(breakdown.symbol.stops_level) ? breakdown.symbol.stops_level : null} />
              <SmallItem label="Freeze" value={isVal(breakdown.symbol.freeze_level) ? breakdown.symbol.freeze_level : null} />
              <SmallItem label="Execution" value={breakdown.symbol.execution} />
              <SmallItem label="Filling" value={breakdown.symbol.filling} />
              <SmallItem label="Vol Step" value={breakdown.symbol.vol_step} />
            </div>
          </>
        ) : (
          <div className="text-[#888888] text-[13px] font-sans italic py-2">
            Environment data unavailable
          </div>
        )}
      </div>

      {/* Expanded Grid Panel */}
      {isOpen && (
        <div className="border-t border-[#3a3a3a] p-5 bg-[#0b0b0b] flex flex-row flex-wrap gap-5 items-stretch overflow-x-auto rounded-b-[6px]">
          <BoundaryPanel title="Account Boundary" data={breakdown.account} />
          <BoundaryPanel title="Terminal Boundary" data={breakdown.terminal} />
          <BoundaryPanel title="Symbol Boundary" data={breakdown.symbol} />
        </div>
      )}
    </div>
  );
}

const isVal = (v) => v !== undefined && v !== null && v !== '' && v !== 'n/a' && v !== 'Unknown';

const PrimaryItem = ({ label, value }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <span className="text-[11px] font-sans text-[#888888] tracking-wider uppercase">{label}</span>
    <span className="text-[15px] font-mono font-bold text-white truncate" title={isVal(value) ? value : 'n/a'}>
      {isVal(value) ? value : 'n/a'}
    </span>
  </div>
);

const MediumItem = ({ label, value }) => {
  if (!isVal(value)) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <span className="text-[11px] font-sans text-[#888888] uppercase tracking-wider">{label}</span>
      <span className="text-[13px] font-mono font-semibold text-[#e0e0e0]">{value}</span>
    </div>
  );
};

const SmallItem = ({ label, value }) => {
  if (!isVal(value)) return null;
  return (
    <div className="flex items-center gap-1.5 bg-[#161616] border border-[#2d2d2d] px-2.5 py-1.5 rounded-[3px]">
      <span className="text-[10px] font-sans text-[#888888] uppercase tracking-wider">{label}:</span>
      <span className="text-[12px] font-mono font-semibold text-[#cccccc]">{value}</span>
    </div>
  );
};
