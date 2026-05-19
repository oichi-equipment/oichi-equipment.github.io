import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileJson } from 'lucide-react';

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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#111922] border border-[rgba(148,163,184,0.15)] rounded-[3px] m-4 mt-0 shadow-lg">
      {/* Header & Filters */}
      <div className="p-3 px-4 border-b border-[rgba(148,163,184,0.15)] bg-[#141f2a] flex flex-wrap items-center gap-4 shrink-0 text-xs">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-100 uppercase tracking-widest">Measured Evidence</span>
          <span className="text-slate-400 text-[10px]">Event-derived diagnostic metrics</span>
        </div>
        
        <div className="w-px h-6 bg-[rgba(148,163,184,0.15)] mx-2"></div>

        <select value={selectedLayer} onChange={(e) => setSelectedLayer(e.target.value)} className="bg-[#0b1117] border border-[rgba(148,163,184,0.2)] rounded px-2 py-1 text-slate-200 focus:border-cyan-500/50 outline-none">
          <option value="">-- All Layers --</option>
          {filters.layers.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="bg-[#0b1117] border border-[rgba(148,163,184,0.2)] rounded px-2 py-1 text-slate-200 focus:border-cyan-500/50 outline-none">
          <option value="">-- All Metrics --</option>
          {filters.metrics.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="bg-[#0b1117] border border-[rgba(148,163,184,0.2)] rounded px-2 py-1 text-slate-200 focus:border-cyan-500/50 outline-none">
          <option value="">-- All Events --</option>
          {filters.events.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedCorrelation} onChange={(e) => setSelectedCorrelation(e.target.value)} className="bg-[#0b1117] border border-[rgba(148,163,184,0.2)] rounded px-2 py-1 text-slate-200 font-mono focus:border-cyan-500/50 outline-none max-w-[150px]">
          <option value="">-- All Correlations --</option>
          {filters.correlations.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <div className="flex-1"></div>
        <div className="text-slate-400 font-mono">Showing {filteredEvidence.length} metrics</div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative bg-[#0b1117]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-[#141f2a] z-10 text-[10px] uppercase tracking-widest text-slate-400 border-b border-[rgba(148,163,184,0.15)] font-semibold shadow-sm">
            <tr>
              <th className="py-2.5 px-4 font-normal">Time</th>
              <th className="py-2.5 px-4 font-normal">Layer</th>
              <th className="py-2.5 px-4 font-normal">Source Event</th>
              <th className="py-2.5 px-4 font-normal">Correlation ID</th>
              <th className="py-2.5 px-4 font-normal text-cyan-400/80">Metric</th>
              <th className="py-2.5 px-4 font-normal text-right text-cyan-400/80">Value</th>
              <th className="py-2.5 px-4 font-normal">Basis / Reason</th>
              <th className="py-2.5 px-4 font-normal text-center w-16">Details</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-[rgba(148,163,184,0.1)] text-[11px]">
            {filteredEvidence.map((ev) => {
              const isExpanded = expandedRows.has(ev.id);
              
              return (
                <React.Fragment key={ev.id}>
                  <tr className="hover:bg-[rgba(148,163,184,0.05)] transition-colors duration-75 text-slate-300">
                    <td className="py-2 px-4 text-slate-400">{formatTime(ev.timestamp)}</td>
                    <td className="py-2 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50 text-slate-300">{ev.layer}</span>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{ev.sourceEvent}</td>
                    <td className="py-2 px-4 text-slate-500 truncate max-w-[100px]" title={ev.correlationId}>{ev.correlationId}</td>
                    <td className="py-2 px-4 font-semibold text-emerald-400/90">{ev.metric}</td>
                    <td className="py-2 px-4 text-right">
                      <span className="text-slate-100 font-bold">{ev.value}</span>
                      {ev.unit && <span className="text-slate-500 ml-1">{ev.unit}</span>}
                    </td>
                    <td className="py-2 px-4 text-slate-400 text-[10px] truncate max-w-[200px]" title={ev.basis}>{ev.basis}</td>
                    <td className="py-2 px-4 text-center">
                      <button 
                        onClick={() => toggleRow(ev.id)}
                        className={`p-1 rounded transition-colors ${isExpanded ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                        title="View Source JSON"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-[#111922]">
                      <td colSpan={8} className="p-0">
                        <div className="p-4 border-l-2 border-cyan-500/50 overflow-x-auto shadow-inner bg-black/20">
                          <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            <span className="text-cyan-500/80">Source Details</span> (Masked Financial Fields)
                          </div>
                          <pre className="text-[10px] text-slate-300 font-mono leading-relaxed p-3 bg-[#0b1117] border border-[rgba(148,163,184,0.1)] rounded-[3px]">
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
                <td colSpan={8} className="py-8 text-center text-slate-500">No measured evidence found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
