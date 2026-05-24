import { useState, useRef } from 'react';
import { GitCommit, AlignLeft, ChevronDown, ChevronUp } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts || ts === '-') return <span className="text-[#71717a]">n/a</span>;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return <span className="text-[#71717a]">n/a</span>;
  return d.toISOString().split('T')[1].replace('Z', '');
};

const formatVal = (val) => val === undefined || val === null ? <span className="text-[#71717a]">n/a</span> : val;
const formatMs = (val) => val === 'n/a' || val === undefined || val === null ? <span className="text-[#71717a]">n/a</span> : `${val} ms`;

const getRetcodeStyle = (retcode, result) => {
  if (retcode === 10009 || retcode === 0) return 'text-uguisu-light font-bold';
  
  const rejects = [10004, 10006, 10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020];
  if (rejects.includes(retcode)) return 'text-enji-light font-bold';
  
  const r = `${result}`.toLowerCase();
  if (r.includes('error') || r.includes('fail')) return 'text-enji-light font-bold';
  if (r.includes('success') || r.includes('ok')) return 'text-uguisu-light font-bold';

  return 'text-[#a1a1aa] font-bold';
};

const formatStatus = (retcode, result) => {
  const hasRetcode = retcode !== undefined && retcode !== null;
  const hasResult = result !== undefined && result !== null && result !== 'n/a';

  if (!hasRetcode && !hasResult) {
    return <span className="text-[#71717a]">n/a</span>;
  }

  const styleClass = getRetcodeStyle(retcode, result);

  if (hasRetcode && hasResult) {
    return <span className={styleClass}>{retcode} <span className="text-[#a1a1aa] font-normal font-sans text-[11px] ml-1">· {result}</span></span>;
  }
  if (hasRetcode) {
    return <span className={styleClass}>{retcode}</span>;
  }
  return <span className={styleClass}>{result}</span>;
};

const formatCorrelationId = (id) => {
  if (!id) return <span className="text-[#71717a]">n/a</span>;
  if (id.length <= 16) return id;
  return id.slice(0, 16) + '...';
};

const TimelineTable = ({ title, rows }) => {
  const INITIAL_ROWS = 10;
  const PAGE_ROWS = 100;
  
  const [viewMode, setViewMode] = useState('preview');
  const [pageIndex, setPageIndex] = useState(0);

  if (!rows || rows.length === 0) return null;
  
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / PAGE_ROWS);
  
  let start = 0;
  let end = 0;
  
  if (viewMode === 'preview') {
    start = 0;
    end = Math.min(INITIAL_ROWS, totalRows);
  } else {
    start = pageIndex * PAGE_ROWS;
    end = Math.min(start + PAGE_ROWS, totalRows);
  }
  
  const displayRows = rows.slice(start, end);
  
  let displayTitle = '';
  if (totalRows === 0) {
    displayTitle = `${title} · 0 rows`;
  } else if (viewMode === 'preview') {
    if (totalRows <= INITIAL_ROWS) {
      displayTitle = `${title} · ${totalRows.toLocaleString()} rows`;
    } else {
      displayTitle = `${title} · Showing ${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${totalRows.toLocaleString()} rows`;
    }
  } else {
    displayTitle = `${title} · Showing ${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${totalRows.toLocaleString()} rows`;
  }

  const anchorRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const handleShowMore = () => {
    setViewMode('paged');
    setPageIndex(0);
  };

  const handleShowLess = () => {
    setViewMode('preview');
    setPageIndex(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollLeft = 0;
        }
        anchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  };

  const handleNext = () => {
    if (pageIndex < totalPages - 1) {
      setPageIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      setPageIndex(prev => prev - 1);
    }
  };

  const showShowMore = viewMode === 'preview' && totalRows > INITIAL_ROWS;
  const showShowLess = viewMode === 'paged';
  const showPrev = viewMode === 'paged';
  const showNext = viewMode === 'paged';

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  return (
    <div className="flex flex-col gap-2 mt-4">
      <h4 className="text-[12px] font-sans font-bold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-2 relative scroll-mt-24" ref={anchorRef}>
        <AlignLeft className="w-3.5 h-3.5 text-[#a1a1aa]" />
        {displayTitle}

        {viewMode === 'paged' && (
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!canPrev}
              className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Prev 100
            </button>
            <button
              onClick={handleShowLess}
              className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next 100 →
            </button>
          </div>
        )}
      </h4>
      <div className="bg-dark-surface border border-dark-border rounded-[3px] overflow-hidden">
        <div className="overflow-x-auto" ref={scrollContainerRef}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#181818] border-b border-dark-border text-[11px] font-sans text-[#a1a1aa] uppercase tracking-wider">
                <th className="py-1.5 px-2 font-medium">Ticket</th>
                <th className="py-1.5 px-2 font-medium">Correlation ID</th>
                <th className="py-1.5 px-2 font-medium">Observed Time</th>
                <th className="py-1.5 px-2 font-medium">Event</th>
                <th className="py-1.5 px-2 font-medium">Status</th>
                <th className="py-1.5 px-2 font-medium">Dispatch</th>
                <th className="py-1.5 px-2 font-medium">Transport</th>
                <th className="py-1.5 px-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="text-[12px] font-mono">
              {displayRows.map((r, i) => (
                <tr key={i} className="border-b border-dark-border/40 hover:bg-[#1a1a1a] transition-colors text-[#d4d4d8]">
                  <td className="py-1.5 px-2 text-[#f3f4f6] font-bold">{formatVal(r.ticket)}</td>
                  <td className="py-1.5 px-2 text-[#a1a1aa] text-[11px]" title={r.correlationId}>{formatCorrelationId(r.correlationId)}</td>
                  <td className="py-1.5 px-2">{formatTime(r.timestamp)}</td>
                  <td className="py-1.5 px-2 font-sans">
                    {r.eventType ? (
                      <span className="px-1.5 py-0.5 bg-dark-base border border-dark-border rounded-sm text-[10px] text-[#d4d4d8]">
                        {r.eventType}
                      </span>
                    ) : (
                      <span className="text-[#71717a]">n/a</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2">{formatStatus(r.retcode, r.result)}</td>
                  <td className="py-1.5 px-2 text-[#f3f4f6]">{formatMs(r.dispatchMs)}</td>
                  <td className="py-1.5 px-2 text-[#f3f4f6]">{formatMs(r.transportMs)}</td>
                  <td className="py-1.5 px-2 text-[#a1a1aa] text-[11px] font-sans">{formatVal(r.messageSource)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {(showShowMore || showShowLess) && (
        <div className="flex flex-col items-center mt-3 gap-2">
          {viewMode === 'paged' && (
            <div className="text-[11px] text-[#71717a] tracking-wide">
              Showing {(start + 1).toLocaleString()}–{Math.min(end, totalRows).toLocaleString()} of {totalRows.toLocaleString()} rows
            </div>
          )}
          <div className="flex justify-center items-center gap-2">
            {viewMode === 'preview' ? (
              <button
                onClick={handleShowMore}
                className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Show more
              </button>
            ) : (
              <>
                <button
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev 100
                </button>
                <button
                  onClick={handleShowLess}
                  className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  className="px-3 py-1.5 text-[#a1a1aa] border border-dark-border bg-dark-base hover:bg-dark-surface rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next 100 →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function CloseResultTimeline({ closeForensics }) {
  if (!closeForensics) return null;

  const {
    commandResultCount,
    closeAllCount,
    closePositionCount,
    missingTicketCount,
    missingCorrelationIdCount,
    mt5ToCommandResultStats,
    commandResultTransportStats,
    closeAllTimelineRows,
    closePositionTimelineRows
  } = closeForensics;

  if (commandResultCount === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-dark-border/50 px-5 pb-5 shrink-0 flex flex-col gap-4 select-none">
      <div className="flex flex-col border-b border-dark-border pb-3">
        <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-uguisu-light" />
          Close Result Timeline
        </h3>
        <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
          Ticket-level close-result notifications observed from local logs.
        </p>
        <p className="text-[11px] font-sans text-[#a1a1aa] mt-1">
          Dispatch is shown on COMMAND_RESULT SERVER_SEND rows. Transport is shown when ws_transport_ms is present.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-2">
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">COMMAND RESULT</span>
          <span className="text-[20px] font-mono font-bold text-[#f3f4f6] leading-none">{commandResultCount}</span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">CLOSE ALL</span>
          <span className="text-[20px] font-mono font-bold text-[#f3f4f6] leading-none">{closeAllCount}</span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">CLOSE POSITION</span>
          <span className="text-[20px] font-mono font-bold text-[#f3f4f6] leading-none">{closePositionCount}</span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">MISSING TICKETS</span>
          <span className={`text-[20px] font-mono font-bold leading-none ${missingTicketCount > 0 ? 'text-[#d4af37]' : 'text-[#f3f4f6]'}`}>{missingTicketCount}</span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">MISSING CORRELATION</span>
          <span className={`text-[20px] font-mono font-bold leading-none ${missingCorrelationIdCount > 0 ? 'text-[#d4af37]' : 'text-[#f3f4f6]'}`}>{missingCorrelationIdCount}</span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">MT5 → RESULT DISPATCH</span>
          <span className="text-[20px] font-mono font-bold text-[#f3f4f6] leading-none">
            {mt5ToCommandResultStats?.p95 === 'n/a' || mt5ToCommandResultStats?.p95 === undefined ? <span className="text-[#71717a]">n/a</span> : mt5ToCommandResultStats.p95} <span className="text-[12px] text-[#a1a1aa]">ms</span>
          </span>
        </div>
        <div className="bg-[#111111] border border-[#2d2d2d] rounded-[3px] p-3 flex flex-col shadow-sm">
          <span className="text-[10px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">WS TRANSPORT</span>
          <span className="text-[20px] font-mono font-bold text-[#f3f4f6] leading-none">
            {commandResultTransportStats?.p95 === 'n/a' || commandResultTransportStats?.p95 === undefined ? <span className="text-[#71717a]">n/a</span> : commandResultTransportStats.p95} <span className="text-[12px] text-[#a1a1aa]">ms</span>
          </span>
        </div>
      </div>

      <TimelineTable title="CLOSE_POSITION Timeline" rows={closePositionTimelineRows} />
      <TimelineTable title="CLOSE_ALL Timeline" rows={closeAllTimelineRows} />
    </div>
  );
}
