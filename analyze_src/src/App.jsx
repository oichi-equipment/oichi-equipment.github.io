import React, { useState, useMemo } from 'react';
import { Database } from 'lucide-react';
import { parseLogFile, extractLatencies } from './utils/parseLogs';
import { calculateStats } from './utils/stats';
import { determinePrimaryBottleneck } from './utils/diagnostics';

import FileIntake from './components/FileIntake';
import DiagnosticCards from './components/DiagnosticCards';
import ResponsibilityBreakdown from './components/ResponsibilityBreakdown';
import EvidenceTable from './components/EvidenceTable';

const THEME = {
  bg: 'bg-[#09090B]',
  panelBorder: 'border-[#27272A]',
  panel: 'bg-[#121214]',
  textPrimary: 'text-[#F1F5F9]',
  textSecondary: 'text-[#94A3B8]',
  textMuted: 'text-[#52525B]'
};

export default function SynkAnalyze() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const newSessions = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsedEvents = await parseLogFile(file);

        if (parsedEvents.length > 0) {
          const sessionId = `ses_${Date.now().toString().slice(-6)}_${i}`;
          newSessions.push({
            id: sessionId,
            name: file.name,
            data: parsedEvents
          });
        }
      }

      if (newSessions.length === 0) {
        alert("No valid JSON logs found.");
      } else {
        setSessions(prev => [...newSessions, ...prev]);
        setActiveSessionId(newSessions[0].id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse log files.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Compute diagnostics memoized
  const { stats, bottleneck } = useMemo(() => {
    if (!activeSession) return { stats: null, bottleneck: null };
    
    const latencies = extractLatencies(activeSession.data);
    
    const aggregatedStats = {
      wsTransport: calculateStats(latencies.wsTransport),
      mt5Execution: calculateStats(latencies.mt5Execution),
      render: calculateStats(latencies.render),
      statusBuild: calculateStats(latencies.statusBuild)
    };

    const primaryBottleneck = determinePrimaryBottleneck(aggregatedStats);

    return { stats: aggregatedStats, bottleneck: primaryBottleneck };
  }, [activeSession]);

  return (
    <div
      className={`relative h-screen w-screen ${THEME.bg} text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-[#708B4B] selection:text-white`}
    >
      <header className={`h-14 border-b ${THEME.panelBorder} ${THEME.panel} flex items-center px-4 justify-between shrink-0`}>
        <div className="flex flex-col">
          <div className={`flex items-center gap-2 ${THEME.textPrimary} font-semibold`}>
            <img src="/analyze/logo-mark.png" alt="Synk Mushroom" className="w-6 h-6 object-contain" />
            <span className="tracking-tight text-sm">
              Synk Mushroom Analyzer <span className={`${THEME.textSecondary} font-normal tracking-wide ml-1`}>Execution Forensics Dashboard</span>
            </span>
          </div>
          <span className="text-[10px] text-[#708B4B] font-mono tracking-widest ml-8 uppercase">Local Log Only / Privacy Aware</span>
        </div>

        <div className="flex items-center gap-2">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`px-3 py-1 text-xs font-mono flex items-center gap-2 border rounded-[3px] transition-none ${
                activeSessionId === s.id
                  ? `bg-[#27272A] ${THEME.textPrimary} border-[#3F3F46]`
                  : `${THEME.textSecondary} border-transparent hover:bg-[#27272A]`
              }`}
            >
              <Database className="w-3 h-3" />
              <span className="max-w-[150px] truncate">{s.name}</span>
            </button>
          ))}
        </div>
      </header>

      {!activeSession ? (
        <FileIntake 
          onUpload={handleFileUpload} 
          isUploading={isUploading} 
          isDragging={isDragging} 
          setIsDragging={setIsDragging} 
        />
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden">
          <DiagnosticCards stats={stats} bottleneck={bottleneck} />
          <ResponsibilityBreakdown events={activeSession.data} />
          <EvidenceTable events={activeSession.data} />
        </main>
      )}
    </div>
  );
}