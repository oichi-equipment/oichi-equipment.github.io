import { useState, useMemo } from 'react';
import { User, Cpu, Target, Sliders, ChevronDown, ChevronUp, Database } from 'lucide-react';

const BoundaryPanel = ({ title, data }) => (
  <div className="flex-1 flex flex-col min-w-[200px] bg-[#161616] border border-[#2d2d2d] rounded-[3px] p-4">
    <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider mb-2.5 border-b border-[#2d2d2d] pb-2 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-[#52662c]" />
      {title}
    </h4>
    <div className="flex flex-col gap-1.5 font-sans text-[12px] flex-1">
      {Object.entries(data).map(([k, v]) => {
        const isUnknown = v === undefined || v === null || v === '' || v === 'Unknown' || v === 'n/a';
        return (
          <div key={k} className="flex items-center justify-between group py-1 border-b border-[#2d2d2d]/50 last:border-0">
            <span className="text-[#a1a1aa] group-hover:text-[#d4d4d8] transition-colors truncate pr-2">{k}</span>
            <span className={isUnknown ? 'text-[#a1a1aa] font-light font-sans' : 'text-[#f3f4f6] font-semibold font-mono truncate max-w-[140px] text-right'} title={String(v)}>
              {isUnknown ? 'n/a' : String(v)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export default function EnvironmentBoundaryStrip({ events, fileName, fileStats, isLargeLog }) {
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

    const financials = {
      balance: 'n/a',
      equity: 'n/a',
      margin: 'n/a',
      free_margin: 'n/a',
      profit: 'n/a',
      credit: 'n/a'
    };

    const sessionPeriod = { start: null, end: null, count: 0 };
    const distinctSymbols = new Set();

    if (events && events.length > 0) {
      events.forEach(ev => {
        sessionPeriod.count++;
        if (ev.timestamp) {
          const ts = new Date(ev.timestamp).getTime();
          if (!isNaN(ts)) {
            if (!sessionPeriod.start || ts < sessionPeriod.start) sessionPeriod.start = ts;
            if (!sessionPeriod.end || ts > sessionPeriod.end) sessionPeriod.end = ts;
          }
        }

        if (ev.symbol && ev.symbol !== '-' && ev.symbol !== 'n/a' && ev.symbol !== '') {
          distinctSymbols.add(ev.symbol);
        }

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

          if (p.balance !== undefined) financials.balance = p.balance;
          if (p.equity !== undefined) financials.equity = p.equity;
          if (p.margin !== undefined) financials.margin = p.margin;
          if (p.margin_free !== undefined) financials.free_margin = p.margin_free;
          if (p.free_margin !== undefined) financials.free_margin = p.free_margin;
          if (p.profit !== undefined) financials.profit = p.profit;
          if (p.credit !== undefined) financials.credit = p.credit;
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
          if (sym) {
            symbol.res_symbol = sym;
            distinctSymbols.add(sym);
          }
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

    return { account, terminal, symbol, financials, sessionPeriod, symbols: Array.from(distinctSymbols) };
  }, [events]);

  const resolvedSymbol = isVal(breakdown.symbol.res_symbol) ? breakdown.symbol.res_symbol : breakdown.symbol.req_symbol;
  
  const hasData = isVal(breakdown.account.login) || 
                  isVal(breakdown.account.company) || 
                  isVal(breakdown.terminal.name) || 
                  isVal(resolvedSymbol);

  const formatSessionPeriod = (start, end) => {
    if (!start || !end) return { date: 'n/a', time: 'n/a' };
    const dStart = new Date(start);
    const dEnd = new Date(end);
    const dateStr = dStart.toISOString().split('T')[0];
    const timeStart = dStart.toISOString().split('T')[1].replace('Z', '').split('.')[0];
    const timeEnd = dEnd.toISOString().split('T')[1].replace('Z', '').split('.')[0];
    return { date: dateStr, time: `${timeStart} - ${timeEnd}` };
  };

  const formatFinancialValue = (val, currency) => {
    if (val === undefined || val === null || val === '') return 'n/a';
    if (typeof val === 'string' && val.includes('MASKED_FINANCIAL')) return 'Masked in source log';
    const num = Number(val);
    if (!isNaN(num)) {
      const formatted = num.toLocaleString();
      return currency && currency !== 'n/a' && currency !== 'Unknown' ? `${formatted} ${currency}` : formatted;
    }
    return val;
  };

  const sessionInfo = formatSessionPeriod(breakdown.sessionPeriod.start, breakdown.sessionPeriod.end);

  const symbolsString = breakdown.symbols.length > 0 
    ? breakdown.symbols.slice(0, 3).join(', ') + (breakdown.symbols.length > 3 ? ` + ${breakdown.symbols.length - 3} more` : '') 
    : isVal(resolvedSymbol) ? resolvedSymbol : 'n/a';

  return (
    <div className="mx-5 mt-5 mb-5 bg-[#111111] border border-[#3a3a3a] rounded-[6px] shadow-lg flex flex-col shrink-0">
      {/* Top Header Row */}
      <div className="px-5 py-3 flex flex-col xl:flex-row justify-between items-center border-b border-[#222222] gap-4">
        {/* Left: Title */}
        <div className="flex flex-col shrink-0 self-start xl:self-auto">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#f3f4f6]" />
            <span className="text-[16px] font-sans font-bold text-[#f3f4f6] tracking-wide uppercase">
              Session / Environment Context
            </span>
          </div>
          <p className="text-[13px] font-sans text-[#a1a1aa] mt-1 mb-2">
            Diagnosis target context.
          </p>
          <div className="flex flex-col gap-1.5 self-start">
            <span className="text-[11px] font-sans text-[#a1a1aa] bg-dark-base border border-dark-border px-2 py-1 rounded-[3px]">
              Selected upload only. Previous sessions are not merged.
            </span>
            {isLargeLog && (
              <span className="text-[11px] font-sans text-[#a1a1aa] bg-dark-base border border-dark-border px-2 py-1 rounded-[3px]">
                Large log mode: table previews are capped for browser stability.
              </span>
            )}
          </div>
        </div>

        {/* Center: Session Identity Summary */}
        {hasData && (
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 flex-1 mx-4">
            <div className="flex items-baseline gap-2 border-r border-[#3f3f46] pr-5">
              <span className="text-[11px] font-sans text-[#f3f4f6] tracking-wider uppercase">Loaded Files:</span>
              <span className="text-[16px] md:text-[18px] font-mono font-bold text-[#d4d4d8] leading-none whitespace-nowrap">
                {fileName}&nbsp;&nbsp;{sessionInfo.date !== 'n/a' ? sessionInfo.date : ''}
              </span>
            </div>
            <div className="flex items-baseline gap-2 border-r border-[#3f3f46] pr-5">
              <span className="text-[11px] font-sans text-[#f3f4f6] tracking-wider uppercase">Log Range:</span>
              <span className="text-[16px] md:text-[18px] font-mono font-bold text-[#d4d4d8] leading-none whitespace-nowrap">{sessionInfo.time}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-sans text-[#f3f4f6] tracking-wider uppercase">Total Events:</span>
              <span className="text-[16px] md:text-[18px] font-mono font-bold text-[#d4d4d8] leading-none whitespace-nowrap">{breakdown.sessionPeriod.count.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Right: Show Details Button */}
        <div className="flex items-center shrink-0 self-end xl:self-auto">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-sans font-bold border border-[#333333] text-[#a1a1aa] hover:text-[#f3f4f6] bg-[#181818] hover:bg-[#252525] transition-colors rounded-[3px]"
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
            {/* Combined Environment & Financial State */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-4">
              {[
                { label: "Broker / Company", value: breakdown.account.company },
                { label: "Server", value: breakdown.account.server },
                { label: "Account", value: breakdown.account.login },
                { label: "Terminal", value: breakdown.terminal.name },
                { label: "Leverage", value: isVal(breakdown.account.leverage) ? `1:${breakdown.account.leverage}` : null },
                { label: "Balance", value: formatFinancialValue(breakdown.financials.balance, breakdown.account.currency) },
                { label: "Equity", value: formatFinancialValue(breakdown.financials.equity, breakdown.account.currency) },
                { label: breakdown.symbols.length > 1 ? "Observed Symbols" : "Observed Symbol", value: symbolsString }
              ].filter(i => isVal(i.value)).map((item, idx, arr) => (
                <div key={item.label} className={`flex items-baseline gap-2 ${idx === arr.length - 1 ? '' : 'border-r border-[#3f3f46] pr-5'}`}>
                  <span className="text-[12px] font-sans text-[#f3f4f6] uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                  <span className="text-[15px] font-mono font-bold text-[#7f944d] whitespace-nowrap" title={String(item.value)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[#a1a1aa] text-[13px] font-sans italic py-2">
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
          <BoundaryPanel title="Financials" data={breakdown.financials} />
          {fileStats && fileStats.length > 0 && (
            <BoundaryPanel title="Loaded Files" data={
              (() => {
                const obj = {};
                fileStats.slice(0, 10).forEach(f => {
                  obj[f.name] = `${f.count.toLocaleString()} events`;
                });
                if (fileStats.length > 10) {
                  obj[`...and ${fileStats.length - 10} more files`] = '';
                }
                return obj;
              })()
            } />
          )}
        </div>
      )}
    </div>
  );
}

const isVal = (v) => v !== undefined && v !== null && v !== '' && v !== 'n/a' && v !== 'Unknown';

