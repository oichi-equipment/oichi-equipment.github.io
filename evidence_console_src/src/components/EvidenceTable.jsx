import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileJson } from 'lucide-react';

const getEventStyle = (event, status) => {
  if (status === 'error' || status === 'failed' || event === 'ERROR') return 'bg-[#991B1B]/10 text-[#F87171] border-l-2 border-[#EF4444]';
  if (event === 'POLLING_OVERRIDE' || event === 'RECONCILE') return 'bg-[#B45309]/10 text-[#FBBF24] border-l-2 border-[#F59E0B]';
  if (event === 'WS_PUSH' || event === 'WS_RECEIVE') return 'text-[#708B4B] border-l-2 border-[#708B4B]';
  if (event === 'STATE_UPDATE') return 'text-[#60A5FA] border-l-2 border-[#3B82F6]';
  if (event === 'FINAL_RENDER') return 'text-[#A78BFA] border-l-2 border-[#8B5CF6]';
  if (event === 'USER_ACTION') return 'text-[#E2E8F0] border-l-2 border-[#E2E8F0] bg-[#27272A]/30';
  return 'text-[#94A3B8] border-l-2 border-transparent';
};

const formatTime = (ts) => {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

export default function EvidenceTable({ events }) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedCorrelation, setSelectedCorrelation] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedSnapshotReason, setSelectedSnapshotReason] = useState("");
  
  const [expandedRows, setExpandedRows] = useState(new Set());

  const filters = useMemo(() => {
    const evs = new Set();
    const cors = new Set();
    const acts = new Set();
    const snaps = new Set();

    events.forEach(d => {
      if (d.event) evs.add(String(d.event));
      if (d.correlation_id) cors.add(String(d.correlation_id));
      if (d.action || d.payload?.action) acts.add(String(d.action || d.payload.action));
      if (d.snapshot_reason || d.payload?.snapshot_reason) snaps.add(String(d.snapshot_reason || d.payload.snapshot_reason));
    });

    return {
      events: Array.from(evs).sort(),
      correlations: Array.from(cors).sort(),
      actions: Array.from(acts).sort(),
      snapshots: Array.from(snaps).sort(),
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(d => {
      if (selectedEvent && String(d.event) !== selectedEvent) return false;
      if (selectedCorrelation && String(d.correlation_id) !== selectedCorrelation) return false;
      
      const act = String(d.action || d.payload?.action || '');
      if (selectedAction && act !== selectedAction) return false;
      
      const snap = String(d.snapshot_reason || d.payload?.snapshot_reason || '');
      if (selectedSnapshotReason && snap !== selectedSnapshotReason) return false;

      return true;
    });
  }, [events, selectedEvent, selectedCorrelation, selectedAction, selectedSnapshotReason]);

  const toggleRow = (idx) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedRows(newSet);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B]">
      {/* Filters */}
      <div className="p-2 px-4 border-y border-[#27272A] bg-[#121214] flex flex-wrap items-center gap-4 shrink-0 text-xs">
        <span className="font-semibold text-[#F1F5F9] uppercase tracking-widest">Raw Evidence</span>
        
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1 text-[#F1F5F9] font-mono focus:border-[#475569]">
          <option value="">-- All Events --</option>
          {filters.events.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedCorrelation} onChange={(e) => setSelectedCorrelation(e.target.value)} className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1 text-[#F1F5F9] font-mono focus:border-[#475569]">
          <option value="">-- All Correlations --</option>
          {filters.correlations.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1 text-[#F1F5F9] font-mono focus:border-[#475569]">
          <option value="">-- All Actions --</option>
          {filters.actions.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={selectedSnapshotReason} onChange={(e) => setSelectedSnapshotReason(e.target.value)} className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1 text-[#F1F5F9] font-mono focus:border-[#475569]">
          <option value="">-- All Snapshots --</option>
          {filters.snapshots.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        
        <div className="flex-1"></div>
        <div className="text-[#52525B] font-mono">Showing {filteredEvents.length} events</div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#121214] z-10 text-xs uppercase tracking-widest text-[#94A3B8] border-b border-[#27272A] font-mono">
            <tr>
              <th className="py-2 px-3 font-normal w-8"></th>
              <th className="py-2 px-4 font-normal">Time</th>
              <th className="py-2 px-4 font-normal">Event</th>
              <th className="py-2 px-4 font-normal">Correlation ID</th>
              <th className="py-2 px-4 font-normal text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-[#27272A] text-sm">
            {filteredEvents.map((incident, idx) => {
              const isExpanded = expandedRows.has(idx);
              const rowStyle = getEventStyle(incident.event, incident.status);
              
              // Find best latency to show (can be extended)
              let latencyMs = '-';
              if (incident.calculated_ws_transport_ms !== undefined) latencyMs = `${incident.calculated_ws_transport_ms}ms (ws)`;
              else if (incident.timings?.total_execution_ms !== undefined) latencyMs = `${incident.timings.total_execution_ms}ms (exec)`;
              
              return (
                <React.Fragment key={idx}>
                  <tr className={`hover:bg-[#18181B] cursor-pointer transition-colors duration-75 ${rowStyle}`} onClick={() => toggleRow(idx)}>
                    <td className="py-2 px-3 text-center text-[#52525B]">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 inline-block" /> : <ChevronRight className="w-3.5 h-3.5 inline-block" />}
                    </td>
                    <td className="py-2 px-4 text-[#94A3B8] whitespace-nowrap">{formatTime(incident.timestamp)}</td>
                    <td className="py-2 px-4 font-semibold tracking-tight">{incident.event || 'Unknown'}</td>
                    <td className="py-2 px-4 text-xs text-[#52525B]">{incident.correlation_id || '-'}</td>
                    <td className="py-2 px-4 text-right text-[#E2E8F0]">{latencyMs}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-[#121214] border-l-2 border-transparent">
                      <td colSpan={5} className="p-0">
                        <div className="p-4 border-b border-[#27272A] overflow-x-auto">
                          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-widest">
                            <FileJson className="w-3.5 h-3.5" /> Raw Event Payload (Masked)
                          </div>
                          <pre className="text-xs text-[#E2E8F0] font-mono leading-relaxed p-4 bg-[#09090B] border border-[#27272A] rounded">
                            {JSON.stringify(incident, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#52525B]">No events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
