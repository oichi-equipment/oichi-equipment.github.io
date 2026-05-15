import React, { useState, useMemo } from 'react';
import {
  Upload, Database, Search, Filter, ChevronDown, ChevronRight,
  AlertTriangle, XCircle, RefreshCw, Activity, Zap, FileJson
} from 'lucide-react';

const THEME = {
  bg: 'bg-[#09090B]',
  panel: 'bg-[#121214]',
  panelBorder: 'border-[#27272A]',
  radius: 'rounded-[3px]',
  textPrimary: 'text-[#F1F5F9]',
  textSecondary: 'text-[#94A3B8]',
  textMuted: 'text-[#52525B]',
  synk: { text: 'text-[#708B4B]', bg: 'bg-[#708B4B]' },
  normal: { text: 'text-[#E2E8F0]', bg: 'bg-[#52525B]' },
  warning: { text: 'text-[#FBBF24]', bg: 'bg-[#B45309]' },
  error: { text: 'text-[#F87171]', bg: 'bg-[#991B1B]' }
};

const getEventStyle = (event, status) => {
  if (status === 'error' || status === 'failed' || event === 'ERROR') return 'bg-[#991B1B]/10 text-[#F87171] border-l-2 border-[#EF4444]';
  if (event === 'POLLING_OVERRIDE' || event === 'RECONCILE') return 'bg-[#B45309]/10 text-[#FBBF24] border-l-2 border-[#F59E0B]';
  
  if (event === 'WS_PUSH' || event === 'WS_RECEIVE') return 'text-[#708B4B] border-l-2 border-[#708B4B]';
  if (event === 'STATE_UPDATE') return 'text-[#60A5FA] border-l-2 border-[#3B82F6]';
  if (event === 'FINAL_RENDER') return 'text-[#A78BFA] border-l-2 border-[#8B5CF6]';
  if (event === 'USER_ACTION') return 'text-[#E2E8F0] border-l-2 border-[#E2E8F0] bg-[#27272A]/30';
  
  return 'text-[#94A3B8] border-l-2 border-transparent';
};

const getPayloadSummary = (d) => {
  const parts = [];
  if (d.action) parts.push(`Action:${d.action}`);
  if (d.price) parts.push(`Price:${d.price}`);
  if (d.sl) parts.push(`SL:${d.sl}`);
  if (d.tp) parts.push(`TP:${d.tp}`);
  if (d.source) parts.push(`Src:${d.source}`);
  if (d.status) parts.push(`Status:${d.status}`);
  if (d.error) parts.push(`Err:${d.error}`);
  
  if (parts.length === 0 && d.payload) {
    let s = '';
    try {
      s = typeof d.payload === 'string' ? d.payload : JSON.stringify(d.payload);
    } catch {
      s = String(d.payload);
    }
    return s.length > 80 ? s.substring(0, 80) + '...' : s;
  }
  return parts.join(' | ') || '-';
};

const formatTime = (ts) => {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().split('T')[1].replace('Z', '');
};

export default function SynkAnalyze() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedCorrelationId, setSelectedCorrelationId] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const newSessions = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const parsed = text
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(Boolean)
          .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

        if (parsed.length > 0) {
          const sessionId = `ses_${Date.now().toString().slice(-6)}_${i}`;
          newSessions.push({
            id: sessionId,
            name: file.name,
            data: parsed,
            stats: { count: parsed.length }
          });
        }
      }

      if (newSessions.length === 0) {
        alert("No valid JSON logs found in the selected files.");
      } else {
        setSessions(prev => [...newSessions, ...prev]);
        setActiveSessionId(newSessions[0].id);
        setSelectedTicketId("");
        setSelectedCorrelationId("");
        setExpandedRows(new Set());
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse log files.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const filters = useMemo(() => {
    if (!activeSession) return { tickets: [], correlations: [] };
    const t = new Set();
    const c = new Set();
    activeSession.data.forEach(d => {
      if (d.ticket) t.add(String(d.ticket));
      if (d.correlation_id) c.add(String(d.correlation_id));
    });
    return { 
      tickets: Array.from(t).sort(), 
      correlations: Array.from(c).sort() 
    };
  }, [activeSession]);

  const filteredEvents = useMemo(() => {
    if (!activeSession) return [];
    let data = activeSession.data;
    if (selectedTicketId) {
      data = data.filter(d => String(d.ticket) === selectedTicketId);
    }
    if (selectedCorrelationId) {
      data = data.filter(d => String(d.correlation_id) === selectedCorrelationId);
    }
    return data;
  }, [activeSession, selectedTicketId, selectedCorrelationId]);

  const toggleRow = (idx) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedRows(newSet);
  };

  return (
    <div
      className={`relative h-screen w-screen ${THEME.bg} text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-[#708B4B] selection:text-white`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-4 border-dashed border-[#708B4B] m-6 rounded-2xl flex items-center justify-center shadow-[0_0_100px_rgba(112,139,75,0.2)]">
          <div className="flex flex-col items-center gap-6 text-[#708B4B]">
            <Upload className="w-20 h-20 animate-bounce" />
            <h2 className="text-4xl font-bold tracking-tight">Drop Execution Log Here</h2>
            <p className="font-mono text-sm uppercase tracking-widest opacity-80">Instant Local Parsing</p>
          </div>
        </div>
      )}

      <header className={`h-12 border-b ${THEME.panelBorder} ${THEME.panel} flex items-center px-4 justify-between shrink-0`}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${THEME.textPrimary} font-semibold`}>
            <img
              src="/analyze/logo-mark.png"
              alt="Synk Mushroom"
              className="w-8 h-8 object-contain"
            />
            <span className="tracking-tight text-sm">
              Synk Mushroom <span className={`${THEME.textSecondary} font-normal tracking-wide ml-1`}>Analyze</span>
            </span>
          </div>
          <div className={`h-4 w-px bg-[#27272A]`}></div>
          <div className="flex items-center gap-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setSelectedTicketId("");
                  setSelectedCorrelationId("");
                  setExpandedRows(new Set());
                }}
                className={`px-3 py-1 text-xs font-mono flex items-center gap-2 border transition-none ${THEME.radius} ${activeSessionId === s.id
                    ? `bg-[#27272A] ${THEME.textPrimary} border-[#3F3F46]`
                    : `${THEME.textSecondary} border-transparent hover:bg-[#27272A]`
                  }`}
              >
                <Database className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{s.name}</span>
                <span className={`ml-1 text-[10px] ${THEME.textMuted}`}>({s.stats.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className={`cursor-pointer px-4 py-1.5 text-xs font-medium border ${THEME.panelBorder} ${THEME.textPrimary} hover:bg-[#27272A] flex items-center gap-2 disabled:opacity-50 transition-none ${THEME.radius}`}>
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Parsing...' : 'Upload .jsonl Log'}
            <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
          </label>
        </div>
      </header>

      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center flex flex-col items-center ${THEME.textMuted} max-w-lg`}>
            <div className="w-20 h-20 border border-[#27272A] bg-[#121214] rounded-xl flex items-center justify-center mb-6 shadow-xl">
              <Upload className="w-8 h-8 text-[#94A3B8]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#F1F5F9] tracking-tight mb-2">Drop Synk Mushroom telemetry logs</h1>
            <p className="text-sm text-[#94A3B8] mb-8">Timeline Event Analysis</p>

            <label className={`cursor-pointer px-6 py-3 text-sm font-semibold border ${THEME.panelBorder} text-[#F1F5F9] bg-[#121214] hover:bg-[#27272A] flex items-center gap-2 transition-colors ${THEME.radius} shadow-lg`}>
              <Upload className="w-4 h-4" />
              Select JSONL File
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
          </div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className={`p-2 px-4 border-b ${THEME.panelBorder} bg-[#121214] flex items-center gap-6 shrink-0`}>
            <div className="flex items-center gap-2">
              <Filter className={`w-4 h-4 ${THEME.textSecondary}`} />
              <span className={`text-xs font-semibold ${THEME.textPrimary} uppercase tracking-widest`}>Filter Timeline</span>
            </div>
            
            <div className="h-4 w-px bg-[#27272A]"></div>
            
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${THEME.textSecondary}`}>Ticket:</span>
              <select 
                value={selectedTicketId} 
                onChange={(e) => {
                  setSelectedTicketId(e.target.value);
                  setExpandedRows(new Set());
                }}
                className={`bg-[#09090B] border ${THEME.panelBorder} ${THEME.radius} text-xs px-2 py-1 ${THEME.textPrimary} focus:outline-none focus:border-[#475569] font-mono min-w-[120px]`}
              >
                <option value="">-- All Tickets --</option>
                {filters.tickets.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${THEME.textSecondary}`}>Correlation ID:</span>
              <select 
                value={selectedCorrelationId} 
                onChange={(e) => {
                  setSelectedCorrelationId(e.target.value);
                  setExpandedRows(new Set());
                }}
                className={`bg-[#09090B] border ${THEME.panelBorder} ${THEME.radius} text-xs px-2 py-1 ${THEME.textPrimary} focus:outline-none focus:border-[#475569] font-mono min-w-[200px]`}
              >
                <option value="">-- All Correlations --</option>
                {filters.correlations.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1"></div>
            
            <div className={`text-xs font-mono ${THEME.textMuted}`}>
              Showing {filteredEvents.length} events
            </div>
          </div>

          {/* Timeline Table */}
          <div className="flex-1 overflow-auto bg-[#09090B] relative">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 bg-[#121214] z-10 text-xs uppercase tracking-widest ${THEME.textSecondary} border-b ${THEME.panelBorder} font-mono shadow-sm`}>
                <tr>
                  <th className="py-2 px-3 font-normal w-8"></th>
                  <th className="py-2 px-4 font-normal">Time</th>
                  <th className="py-2 px-4 font-normal">Event</th>
                  <th className="py-2 px-4 font-normal">Ticket</th>
                  <th className="py-2 px-4 font-normal">Correlation ID</th>
                  <th className="py-2 px-4 font-normal">Symbol</th>
                  <th className="py-2 px-4 font-normal">Source</th>
                  <th className="py-2 px-4 font-normal text-right">Latency</th>
                  <th className="py-2 px-4 font-normal">Status</th>
                  <th className="py-2 px-4 font-normal">Summary</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-[#27272A] text-sm">
                {filteredEvents.map((incident, idx) => {
                  const isExpanded = expandedRows.has(idx);
                  const rowStyle = getEventStyle(incident.event, incident.status);
                  const latencyMs = incident.latency_ms ?? incident.timings?.total_execution_ms ?? '-';
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        className={`hover:bg-[#18181B] cursor-pointer transition-colors duration-75 ${rowStyle}`}
                        onClick={() => toggleRow(idx)}
                      >
                        <td className="py-2 px-3 text-center text-[#52525B]">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 inline-block" /> : <ChevronRight className="w-3.5 h-3.5 inline-block" />}
                        </td>
                        <td className={`py-2 px-4 ${THEME.textSecondary} whitespace-nowrap`}>
                          {formatTime(incident.timestamp)}
                        </td>
                        <td className={`py-2 px-4 font-semibold tracking-tight`}>
                          {incident.event || '-'}
                        </td>
                        <td className={`py-2 px-4 ${THEME.textSecondary}`}>
                          {incident.ticket || '-'}
                        </td>
                        <td className={`py-2 px-4 text-xs ${THEME.textMuted} truncate max-w-[150px]`} title={incident.correlation_id}>
                          {incident.correlation_id || '-'}
                        </td>
                        <td className={`py-2 px-4 text-slate-200 font-light`}>
                          {incident.symbol || '-'}
                        </td>
                        <td className={`py-2 px-4 ${THEME.textSecondary}`}>
                          {incident.source || '-'}
                        </td>
                        <td className={`py-2 px-4 text-right ${THEME.textPrimary}`}>
                          {latencyMs !== '-' ? `${latencyMs}ms` : '-'}
                        </td>
                        <td className="py-2 px-4">
                          {incident.status ? (
                            <span className={`${incident.status === 'error' || incident.status === 'failed' ? THEME.error.text : THEME.textSecondary}`}>
                              {incident.status}
                            </span>
                          ) : '-'}
                        </td>
                        <td className={`py-2 px-4 text-xs ${THEME.textSecondary} truncate max-w-[300px]`} title={getPayloadSummary(incident)}>
                          {getPayloadSummary(incident)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#121214] border-l-2 border-transparent">
                          <td colSpan={10} className="p-0">
                            <div className={`p-4 border-b ${THEME.panelBorder} overflow-x-auto`}>
                              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-widest">
                                <FileJson className="w-3.5 h-3.5" /> Raw Event Payload
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
                    <td colSpan={10} className="py-8 text-center text-[#52525B]">
                      No events found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}
    </div>
  );
}