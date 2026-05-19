import React, { useState, useMemo } from 'react';
import { Database, UploadCloud, Shield, FileJson, Download } from 'lucide-react';
import { parseLogFile, extractLatencies } from './utils/parseLogs';
import { maskForSubmission } from './utils/maskSensitive';
import { calculateStats } from './utils/stats';
import { determinePrimaryBottleneck } from './utils/diagnostics';
import { extractMeasuredEvidence } from './utils/evidence';

import DiagnosticCards from './components/DiagnosticCards';
import ResponsibilityBreakdown from './components/ResponsibilityBreakdown';
import LayerLatencyOverview from './components/LayerLatencyOverview';
import MeasuredEvidence from './components/MeasuredEvidence';

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

  const handleDownloadSubmission = () => {
    if (!activeSession) return;
    
    // Mask the raw parsed data for submission
    const submissionData = activeSession.data.map(event => maskForSubmission(event));
    
    // Convert back to JSONL
    let jsonlString = submissionData.map(ev => JSON.stringify(ev)).join('\n');
    
    // ----------------------------------------------------------------
    // VALUE-BASED STRING REPLACEMENT FOR ABSOLUTE SAFETY
    // Replace all known path patterns directly in the final string
    // ----------------------------------------------------------------
    
    // Windows paths (C:\..., C:/...)
    jsonlString = jsonlString.replace(/(["']?)(?:[A-Z]:\\\\|[A-Z]:\/).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');
    
    // Common directories
    jsonlString = jsonlString.replace(/(["']?).*?(?:\\\\Users\\\\|\/Users\/|Documents\\\\SynkMushroom|Documents\/SynkMushroom).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');
    
    // Unix/Mac paths
    jsonlString = jsonlString.replace(/(["']?)(?:\/home\/|\/mnt\/|\/var\/|\/tmp\/).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');

    // Quick post-mask validation
    const suspiciousPatterns = [
      /[A-Z]:\\\\/i, /[A-Z]:\//i, /\\\\Users\\\\/i, /\/Users\//i, 
      /Documents\\\\SynkMushroom/i, /Documents\/SynkMushroom/i,
      /SynkMushroom\\\\logs/i, /SynkMushroom\/logs/i,
      /"log_path"\s*:\s*"(?!\[MASKED_LOCAL_PATH\])[^"]+"/i,
      /"balance"\s*:/i, /"equity"\s*:/i, /"profit"\s*:/i
    ];
    
    for (const regex of suspiciousPatterns) {
      if (regex.test(jsonlString)) {
        console.warn(`[Synk Analyzer Warning] Potential unmasked sensitive data detected matching: ${regex}`);
        // Force replace if anything slipped through matching C:\ or similar
        if (/[A-Z]:\\\\/i.test(jsonlString) || /[A-Z]:\//i.test(jsonlString)) {
           jsonlString = jsonlString.replace(/"[^"]*?[A-Z]:(?:\\\\|\/)[^"]*?"/gi, '"[MASKED_LOCAL_PATH]"');
        }
      }
    }
    
    const blob = new Blob([jsonlString], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `synk-analyzer-submission-log-${activeSession.name}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { stats, bottleneck, evidence } = useMemo(() => {
    if (!activeSession) return { stats: null, bottleneck: null, evidence: [] };
    
    const latencies = extractLatencies(activeSession.data);
    
    const aggregatedStats = {
      wsTransport: calculateStats(latencies.wsTransport),
      mt5Execution: calculateStats(latencies.mt5Execution),
      render: calculateStats(latencies.render),
      statusBuild: calculateStats(latencies.statusBuild)
    };

    const primaryBottleneck = determinePrimaryBottleneck(aggregatedStats);
    const measuredEvidence = extractMeasuredEvidence(activeSession.data);

    return { stats: aggregatedStats, bottleneck: primaryBottleneck, evidence: measuredEvidence };
  }, [activeSession]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b1117] text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-white relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
        }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-4 border-dashed border-cyan-500/80 m-6 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.2)]">
          <Database className="w-20 h-20 text-cyan-500 animate-bounce mb-6" />
          <h2 className="text-4xl font-bold tracking-tight text-cyan-400">Drop Execution Log Here</h2>
          <p className="font-mono text-sm uppercase tracking-widest opacity-80 text-cyan-600 mt-2">Local Parsing Only</p>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 border-b border-[rgba(148,163,184,0.15)] bg-[#141f2a] flex items-center px-6 justify-between shrink-0 shadow-sm z-10 w-full">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-[rgba(148,163,184,0.15)] pr-4">
            <img src="/analyze/logo-mark.png" alt="Synk Mushroom" className="w-6 h-6 object-contain" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-100 tracking-tight leading-none mb-1">Synk Analyzer</span>
              <span className="text-[9px] text-cyan-500/80 font-mono uppercase tracking-widest leading-none">Execution Forensics</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`px-3 py-1 text-[11px] font-mono flex items-center gap-2 border rounded-[3px] transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-[#151f2b] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                    : 'text-slate-400 border-[rgba(148,163,184,0.15)] hover:border-slate-600 hover:text-slate-200 bg-[#0b1117]'
                }`}
              >
                <Database className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{s.name}</span>
                {activeSessionId === s.id && <span className="ml-1 text-[9px] text-cyan-500/50 bg-cyan-500/10 px-1 rounded">{s.data.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions & Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-slate-500 border-r border-[rgba(148,163,184,0.15)] pr-4 hidden md:flex">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500/80"/> Privacy Aware</span>
            <span className="flex items-center gap-1"><FileJson className="w-3 h-3 text-slate-400"/> JSONL Only</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <button 
                onClick={handleDownloadSubmission}
                className="px-4 py-1.5 text-[11px] font-semibold border border-[rgba(148,163,184,0.3)] text-slate-300 hover:text-white bg-[#0b1117] hover:bg-slate-800 flex items-center gap-2 transition-colors rounded-[3px] shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Submission Log
              </button>
            )}

            <label className="cursor-pointer px-4 py-1.5 text-[11px] font-semibold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center gap-2 transition-colors rounded-[3px] shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              {isUploading ? 'Parsing...' : 'Upload JSONL'}
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-[#0b1117]">
        {/* KPI Row */}
        <DiagnosticCards 
          stats={stats} 
          bottleneck={bottleneck} 
          counts={activeSession ? activeSession.data.length : 0} 
        />
        
        {/* Analysis Row */}
        <div className="flex flex-col xl:flex-row gap-5 px-5 py-2 shrink-0">
          <LayerLatencyOverview stats={stats} />
          <ResponsibilityBreakdown events={activeSession ? activeSession.data : []} />
        </div>

        {/* Evidence Data Table */}
        <MeasuredEvidence evidence={evidence} />
      </main>
    </div>
  );
}