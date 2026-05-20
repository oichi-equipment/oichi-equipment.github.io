import React, { useState, useMemo } from 'react';
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
  
  const [expandedRows, setExpandedRows] = useState(new Set());

  const filters = useMemo(() => {
    const layers = new Set();
    const metrics = new Set();
    const evs = new Set();
    const cors = new Set();

    evidence.forEach(d => {
      if (d.layer) layers.add(d.layer);
      if (d.metric) metrics.add(d.metric);
      if (d.sourceEvent) evs.add(d.sourceEvent);
      if (d.correlationId && d.correlationId !== '-') cors.add(d.correlationId);
    });

    return {
      layers: Array.from(layers).sort(),
      metrics: Array.from(metrics).sort(),
      events: Array.from(evs).sort(),
      correlations: Array.from(cors).sort()
    };
  }, [evidence]);

  const filteredEvidence = useMemo(() => {
    return evidence.filter(d => {
      if (selectedLayer && d.layer !== selectedLayer) return false;
      if (selectedMetric && d.metric !== selectedMetric) return false;
      if (selectedEvent && d.sourceEvent !== selectedEvent) return false;
      if (selectedCorrelation && d.correlationId !== selectedCorrelation) return false;
      return true;
    });
  }, [evidence, selectedLayer, selectedMetric, selectedEvent, selectedCorrelation]);

  const toggleRow = (idx) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedRows(newSet);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-dark-card border border-dark-border rounded-[3px] m-4 mt-0 shadow-lg">
      {/* Header & Filters */}
      <div className="p-3.5 px-4 border-b border-dark-border bg-dark-card flex flex-wrap items-center gap-4 shrink-0 text-xs">
        <div className="flex flex-col">
          <span className="font-sans font-bold text-text-main uppercase tracking-wider text-[15px]">Measured Evidence</span>
          <span className="text-text-sub text-[12px] font-sans">Event-derived diagnostic metrics</span>
        </div>
        
        <div className="w-px h-6 bg-dark-border/40 mx-2"></div>

        <select value={selectedLayer} onChange={(e) => setSelectedLayer(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-text-sub focus:border-uguisu-light/50 outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Layers --</option>
          {filters.layers.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-text-sub focus:border-uguisu-light/50 outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Metrics --</option>
          {filters.metrics.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-text-sub focus:border-uguisu-light/50 outline-none text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Events --</option>
          {filters.events.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedCorrelation} onChange={(e) => setSelectedCorrelation(e.target.value)} className="bg-dark-base border border-dark-border rounded px-2.5 py-1.5 text-text-sub font-mono focus:border-uguisu-light/50 outline-none max-w-[150px] text-[12px] uppercase font-semibold font-sans">
          <option value="">-- All Correlations --</option>
          {filters.correlations.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <div className="flex-1"></div>
        <div className="text-text-sub font-sans text-[13px]">
          Showing <span className="font-mono font-bold text-text-main">{filteredEvidence.length}</span> metrics
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative bg-dark-base">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-dark-thead z-10 text-[12px] font-sans font-bold uppercase tracking-wider text-text-sub border-b border-dark-border shadow-sm">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Time</th>
              <th className="py-3.5 px-4 font-semibold">Layer</th>
              <th className="py-3.5 px-4 font-semibold">Source Event</th>
              <th className="py-3.5 px-4 font-semibold">Correlation ID</th>
              <th className="py-3.5 px-4 font-semibold text-uguisu-light">Metric</th>
              <th className="py-3.5 px-4 font-semibold text-right text-uguisu-light">Value</th>
              <th className="py-3.5 px-4 font-semibold">Basis / Reason</th>
              <th className="py-3.5 px-4 font-semibold text-center w-16">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border/40 text-[13px] font-sans">
            {filteredEvidence.map((ev) => {
              const isExpanded = expandedRows.has(ev.id);
              
              return (
                <React.Fragment key={ev.id}>
                  <tr className="hover:bg-dark-hover transition-colors duration-75 text-text-sub">
                    <td className="py-3 px-4 text-text-sub font-mono">{formatTime(ev.timestamp)}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-dark-base border border-dark-border text-text-sub font-sans text-[12px]">{ev.layer}</span>
                    </td>
                    <td className="py-3 px-4 text-text-sub font-sans">{ev.sourceEvent}</td>
                    <td className="py-3 px-4 text-text-muted font-mono truncate max-w-[100px]" title={ev.correlationId}>{ev.correlationId}</td>
                    <td className="py-3 px-4 font-bold text-uguisu-light/90 font-sans">{ev.metric}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="text-text-main font-bold">{ev.value}</span>
                      {ev.unit && <span className="text-text-muted ml-1">{ev.unit}</span>}
                    </td>
                    <td className="py-3 px-4 text-text-sub text-[12px] font-sans truncate max-w-[200px]" title={ev.basis}>{ev.basis}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => toggleRow(ev.id)}
                        className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-dark-base text-uguisu-light border border-uguisu/30' : 'text-text-muted hover:text-text-main hover:bg-dark-hover'}`}
                        title="View Source JSON"
                      >
                        <FileJson className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-dark-card animate-none">
                      <td colSpan={8} className="p-0">
                        <div className="p-4 border-l-2 border-uguisu overflow-x-auto shadow-inner bg-dark-surface">
                          <div className="flex items-center gap-2 mb-2 text-[12px] font-sans font-bold text-text-sub uppercase tracking-wider">
                            <span className="text-uguisu-light/80">Source Details</span> (Masked Financial Fields)
                          </div>
                          <pre className="text-[12px] text-text-sub font-mono leading-relaxed p-3 bg-dark-base border border-dark-border rounded-[3px]">
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
                <td colSpan={8} className="py-8 text-center text-text-muted font-sans">No measured evidence found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
