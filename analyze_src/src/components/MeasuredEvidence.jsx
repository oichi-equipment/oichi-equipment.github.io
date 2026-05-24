import React, { useState, useMemo, useEffect } from 'react';
import { FileJson } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

export default function MeasuredEvidence({ evidence }) {
  const [selectedLayer, setSelectedLayer] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedCorrelation, setSelectedCorrelation] = useState("");
  const [selectedMessageType, setSelectedMessageType] = useState("");
  const [selectedMessageSource, setSelectedMessageSource] = useState("");
  
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('preview');
  const [pageIndex, setPageIndex] = useState(0);

  const filters = useMemo(() => {
    const layers = new Set();
    const metrics = new Set();
    const evs = new Set();
    const cors = new Set();
    const msgTypes = new Set();
    const msgSources = new Set();

    if (evidence) {
      evidence.forEach(d => {
        if (d.layer) layers.add(d.layer);
        if (d.metric) metrics.add(d.metric);
        if (d.sourceEvent) evs.add(d.sourceEvent);
        if (d.correlationId && d.correlationId !== '-') cors.add(d.correlationId);
        if (d.messageType && d.messageType !== '-') msgTypes.add(d.messageType);
        if (d.messageSource && d.messageSource !== '-') msgSources.add(d.messageSource);
      });
    }

    return {
      layers: Array.from(layers).sort(),
      metrics: Array.from(metrics).sort(),
      events: Array.from(evs).sort(),
      correlations: Array.from(cors).sort(),
      messageTypes: Array.from(msgTypes).sort(),
      messageSources: Array.from(msgSources).sort()
    };
  }, [evidence]);

  const filteredEvidence = useMemo(() => {
    if (!evidence) return [];
    return evidence.filter(d => {
      if (selectedLayer && d.layer !== selectedLayer) return false;
      if (selectedMetric && d.metric !== selectedMetric) return false;
      if (selectedEvent && d.sourceEvent !== selectedEvent) return false;
      if (selectedCorrelation && d.correlationId !== selectedCorrelation) return false;
      if (selectedMessageType && d.messageType !== selectedMessageType) return false;
      if (selectedMessageSource && d.messageSource !== selectedMessageSource) return false;
      return true;
    });
  }, [evidence, selectedLayer, selectedMetric, selectedEvent, selectedCorrelation, selectedMessageType, selectedMessageSource]);

  useEffect(() => {
    setViewMode('preview');
    setPageIndex(0);
  }, [evidence, selectedLayer, selectedMetric, selectedEvent, selectedCorrelation, selectedMessageType, selectedMessageSource]);

  const INITIAL_ROWS = 10;
  const PAGE_ROWS = 100;

  const totalRows = filteredEvidence.length;
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

  const displayedEvidence = filteredEvidence.slice(start, end);

  const anchorRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);

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

  const toggleRow = (idx) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedRows(newSet);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#111111] border border-[#2d2d2d] rounded-[3px] shadow-sm">
      {/* Filters */}
      <div className="p-3.5 px-4 border-b border-[#2d2d2d] bg-[#161616] flex flex-wrap items-center gap-4 shrink-0 text-xs scroll-mt-24" ref={anchorRef}>
        
        <select value={selectedLayer} onChange={(e) => setSelectedLayer(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Layers --</option>
          {filters.layers.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Metrics --</option>
          {filters.metrics.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Events --</option>
          {filters.events.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedMessageType} onChange={(e) => setSelectedMessageType(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Types --</option>
          {filters.messageTypes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={selectedMessageSource} onChange={(e) => setSelectedMessageSource(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-[#d4d4d8] focus:border-[#a1a1aa] outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Sources --</option>
          {filters.messageSources.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedCorrelation} onChange={(e) => setSelectedCorrelation(e.target.value)} className="bg-dark-base border border-dark-border rounded pl-2.5 pr-8 py-1.5 text-[#d4d4d8] font-mono focus:border-[#a1a1aa] outline-none min-w-[190px] max-w-[210px] text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Correlations --</option>
          {filters.correlations.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <div className="flex-1"></div>
        <div className="text-[#a1a1aa] font-sans text-[13px]">
          {totalRows === 0 ? (
            <>Showing <span className="font-mono font-bold text-[#f3f4f6]">0</span> metrics</>
          ) : viewMode === 'preview' ? (
            totalRows <= INITIAL_ROWS ? (
              <>Showing <span className="font-mono font-bold text-[#f3f4f6]">{totalRows.toLocaleString()}</span> metrics</>
            ) : (
              <>Showing <span className="font-mono font-bold text-[#f3f4f6]">{start + 1}–{end.toLocaleString()}</span> of <span className="font-mono font-bold text-[#f3f4f6]">{totalRows.toLocaleString()}</span> metrics</>
            )
          ) : (
            <>Showing <span className="font-mono font-bold text-[#f3f4f6]">{start + 1}–{end.toLocaleString()}</span> of <span className="font-mono font-bold text-[#f3f4f6]">{totalRows.toLocaleString()}</span> metrics</>
          )}
        </div>
      </div>

      {viewMode === 'paged' && (
        <div className="py-2 border-b border-[#2d2d2d] bg-[#0b0b0b] flex justify-center items-center gap-2 shrink-0">
          <button 
            onClick={handlePrev}
            disabled={!canPrev}
            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Prev 100
          </button>
          <button 
            onClick={handleShowLess}
            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors"
          >
            Show less
          </button>
          <button 
            onClick={handleNext}
            disabled={!canNext}
            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next 100 →
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto relative bg-dark-base" ref={scrollContainerRef}>
        <table className="w-full text-left border-collapse whitespace-nowrap opacity-90">
          <thead className="sticky top-0 bg-[#0b0b0b] z-10 text-[11px] font-sans font-bold uppercase tracking-wider text-[#a1a1aa] border-b border-[#2d2d2d] shadow-sm">
            <tr>
              <th className="py-3 px-4 font-semibold">Time</th>
              <th className="py-3 px-4 font-semibold">Layer</th>
              <th className="py-3 px-4 font-semibold">Source Event</th>
              <th className="py-3 px-4 font-semibold">Correlation ID</th>
              <th className="py-3 px-4 font-semibold text-[#a1a1aa]">Metric</th>
              <th className="py-3 px-4 font-semibold text-right text-[#f3f4f6]">Value</th>
              <th className="py-3 px-4 font-semibold">Basis / Reason</th>
              <th className="py-3 px-4 font-semibold text-center w-16">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f1f1f] text-[12px] font-sans">
            {displayedEvidence.map((ev) => {
              const isExpanded = expandedRows.has(ev.id);
              
              return (
                <React.Fragment key={ev.id}>
                  <tr className="hover:bg-[#181818] transition-colors duration-75 text-[#d4d4d8]">
                    <td className="py-3 px-4 text-[#a1a1aa] font-mono">{formatTime(ev.timestamp)}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-[3px] bg-dark-base border border-[#2d2d2d] text-[#a1a1aa] font-sans text-[11px] uppercase tracking-wider">{ev.layer}</span>
                    </td>
                    <td className="py-3 px-4 text-[#f3f4f6] font-sans">{ev.sourceEvent}</td>
                    <td className="py-3 px-4 text-[#a1a1aa] font-mono truncate max-w-[100px]" title={ev.correlationId}>{ev.correlationId}</td>
                    <td className="py-3 px-4 font-bold text-[#f3f4f6] font-sans">{ev.metric}</td>
                    <td className="py-3 px-4 text-right font-mono text-[13px]">
                      <span className="text-[#f3f4f6] font-bold">{ev.value}</span>
                      {ev.unit && <span className="text-[#a1a1aa] ml-1">{ev.unit}</span>}
                    </td>
                    <td className="py-3 px-4 text-[#a1a1aa] text-[11px] font-sans truncate max-w-[200px]" title={ev.basis}>
                      {ev.basis}
                      {(ev.messageType || ev.messageSource || ev.ticket) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {ev.messageType && <span className="px-1.5 py-0.5 rounded-[2px] bg-[#1a1a1a] border border-[#333333] text-[#a1a1aa] text-[9px] uppercase tracking-wider">{ev.messageType}</span>}
                          {ev.messageSource && <span className="px-1.5 py-0.5 rounded-[2px] bg-[#1a1a1a] border border-[#333333] text-[#a1a1aa] text-[9px] uppercase tracking-wider">{ev.messageSource}</span>}
                          {ev.ticket && <span className="px-1.5 py-0.5 rounded-[2px] bg-[#1a1a1a] border border-[#333333] text-[#d4af37] text-[9px] font-mono tracking-wider">#{ev.ticket}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => toggleRow(ev.id)}
                        className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-dark-base text-[#a1a1aa] border border-[#2d2d2d]' : 'text-[#a1a1aa] hover:text-[#f3f4f6] hover:bg-[#252525]'}`}
                        title="View Source JSON"
                      >
                        <FileJson className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-[#0b0b0b] animate-none">
                      <td colSpan={8} className="p-0 border-t border-[#1f1f1f]">
                        <div className="p-4 border-l-2 border-uguisu overflow-x-auto shadow-inner bg-dark-surface">
                          <div className="flex items-center gap-2 mb-2 text-[12px] font-sans font-bold text-[#a1a1aa] uppercase tracking-wider">
                            <span className="text-[#d4d4d8]">Source Details</span> (Masked Financial Fields)
                          </div>
                          <pre className="text-[12px] text-[#d4d4d8] font-mono leading-relaxed p-3 bg-dark-base border border-dark-border rounded-[3px]">
                            {JSON.stringify(ev.sourceJson, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredEvidence.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#a1a1aa] font-sans">No measured evidence found matching filters.</td>
              </tr>
            )}
            {(showShowMore || showShowLess) && (
              <tr>
                <td colSpan={8} className="py-4 text-center bg-[#0d0d0d] border-t border-[#1f1f1f]">
                  <div className="flex flex-col items-center gap-2">
                    {viewMode === 'paged' && (
                      <div className="text-[11px] text-[#71717a] tracking-wide">
                        Showing {(start + 1).toLocaleString()}–{Math.min(end, totalRows).toLocaleString()} of {totalRows.toLocaleString()} metrics
                      </div>
                    )}
                    <div className="flex justify-center items-center gap-2">
                      {viewMode === 'preview' ? (
                        <button 
                          onClick={handleShowMore}
                          className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors"
                        >
                          Show more
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={handlePrev}
                            disabled={!canPrev}
                            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Prev 100
                          </button>
                          <button 
                            onClick={handleShowLess}
                            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors"
                          >
                            Show less
                          </button>
                          <button 
                            onClick={handleNext}
                            disabled={!canNext}
                            className="px-4 py-2 text-[12px] font-sans font-bold text-[#f3f4f6] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next 100 →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
