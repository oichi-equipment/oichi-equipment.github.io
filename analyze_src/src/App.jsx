import { useState, useMemo } from 'react';
import { Database, UploadCloud, Shield, FileJson, Download } from 'lucide-react';
import { parseLogFile, extractLatencies } from './utils/parseLogs';
import { maskForSubmission } from './utils/maskSensitive';
import { calculateStats } from './utils/stats';
import { determinePrimaryBottleneck } from './utils/diagnostics';
import { extractMeasuredEvidence } from './utils/evidence';
import { extractCommandChains, extractRetcodeSummary, extractPollingSummary } from './utils/commandForensics';

import DiagnosticCards from './components/DiagnosticCards';
import EnvironmentBoundaryStrip from './components/EnvironmentBoundaryStrip';
import LayerLatencyOverview from './components/LayerLatencyOverview';
import CommandForensics from './components/CommandForensics';
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
        console.warn(`[Synk Warning] Potential unmasked sensitive data detected matching: ${regex}`);
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

  const { stats, bottleneck, evidence, commandChains, retcodeSummary, pollingSummary, totalObservedStats, totalExecuted, totalFailed, slowestCommand } = useMemo(() => {
    if (!activeSession) {
      return { 
        stats: null, 
        bottleneck: null, 
        evidence: [], 
        commandChains: [], 
        retcodeSummary: [], 
        pollingSummary: null, 
        totalObservedStats: null, 
        totalExecuted: 0, 
        totalFailed: 0, 
        slowestCommand: null 
      };
    }
    
    const latencies = extractLatencies(activeSession.data);
    
    const aggregatedStats = {
      wsTransport: calculateStats(latencies.wsTransport),
      mt5Execution: calculateStats(latencies.mt5Execution),
      render: calculateStats(latencies.render),
      statusBuild: calculateStats(latencies.statusBuild)
    };

    const primaryBottleneck = determinePrimaryBottleneck(aggregatedStats);
    const measuredEvidence = extractMeasuredEvidence(activeSession.data);
    
    const chains = extractCommandChains(activeSession.data);
    const retcodes = extractRetcodeSummary(activeSession.data);
    const polling = extractPollingSummary(chains);

    const tradeChains = chains.filter(c => c.type === 'Trade');
    const totalObservedLats = tradeChains
      .map(c => c.latencies.totalObserved)
      .filter(val => typeof val === 'number' && !isNaN(val));
    const obsStats = calculateStats(totalObservedLats);

    const executedCount = tradeChains.length;
    
    // Fail count based on classification
    const rejects = [10004, 10006, 10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020];
    const failedCount = tradeChains.filter(c => {
      if (rejects.includes(c.retcode)) return true;
      if (c.result && `${c.result}`.toLowerCase().includes('fail')) return true;
      return false;
    }).length;

    const slowest = tradeChains.reduce((slowestDp, current) => {
      const lat = typeof current.latencies.mt5Execution === 'number' ? current.latencies.mt5Execution : 0;
      const slowestLat = slowestDp && typeof slowestDp.latencies.mt5Execution === 'number' ? slowestDp.latencies.mt5Execution : 0;
      return lat > slowestLat ? current : slowestDp;
    }, null);

    return { 
      stats: aggregatedStats, 
      bottleneck: primaryBottleneck, 
      evidence: measuredEvidence, 
      commandChains: chains, 
      retcodeSummary: retcodes, 
      pollingSummary: polling,
      totalObservedStats: obsStats,
      totalExecuted: executedCount,
      totalFailed: failedCount,
      slowestCommand: slowest
    };
  }, [activeSession]);

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-base text-text-main font-sans overflow-hidden selection:bg-uguisu/30 selection:text-text-main relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
        }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-dark-base/95 backdrop-blur-[4px] border-4 border-dashed border-uguisu/60 m-6 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.03)]">
          <Database className="w-20 h-20 text-uguisu animate-bounce mb-6" />
          <h2 className="text-4xl font-bold tracking-tight text-uguisu-light">Drop Execution Log Here</h2>
          <p className="font-mono text-sm uppercase tracking-widest opacity-80 text-text-sub mt-2">Local Parsing Only</p>
        </div>
      )}

      {/* Top Header */}
      <header className="h-16 border-b border-dark-border bg-dark-nav flex items-center px-6 justify-between shrink-0 shadow-sm z-10 w-full">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-dark-border pr-4">
            <img src="/analyze/logo-mark.png" alt="Synk Mushroom" className="w-6 h-6 object-contain" />
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-text-main tracking-tight leading-none mb-1">Synk Analyzer</span>
              <span className="text-[11px] text-uguisu-light/80 font-sans uppercase tracking-widest leading-none mt-1">Execution Forensics</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`px-3.5 py-1.5 text-[13px] font-sans font-semibold flex items-center gap-2 border rounded-[3px] transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-dark-surface text-uguisu-light border-uguisu/40 shadow-[0_0_10px_rgba(82,102,44,0.1)]'
                    : 'text-text-sub border-dark-border hover:border-uguisu hover:text-text-main bg-dark-base'
                }`}
              >
                <Database className="w-3 h-3 text-text-muted" />
                <span className="max-w-[120px] truncate">{s.name}</span>
                {activeSessionId === s.id && <span className="ml-1 text-[10px] text-uguisu-light/60 bg-dark-base border border-dark-border px-1.5 rounded font-mono">{s.data.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions & Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[12px] font-sans tracking-wider uppercase text-text-muted border-r border-dark-border pr-4 hidden md:flex">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-uguisu-light/80"/> Privacy Aware</span>
            <span className="flex items-center gap-1.5"><FileJson className="w-3.5 h-3.5 text-text-sub"/> JSONL Only</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <button 
                onClick={handleDownloadSubmission}
                className="px-4 py-2 text-[13px] font-sans font-semibold border border-dark-border text-text-sub hover:text-text-main bg-dark-card hover:bg-dark-hover hover:border-uguisu/40 flex items-center gap-2 transition-colors rounded-[3px] shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Submission Log
              </button>
            )}

            <label className="cursor-pointer px-4 py-2 text-[13px] font-sans font-semibold border border-uguisu/20 text-white bg-uguisu hover:bg-uguisu-hover flex items-center gap-2 transition-colors rounded-[3px] shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              {isUploading ? 'Parsing...' : 'Upload JSONL'}
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-dark-base relative">
        {/* Session / Environment Context */}
        <EnvironmentBoundaryStrip 
          events={activeSession ? activeSession.data : []} 
          fileName={activeSession ? activeSession.name : ''} 
        />

        {/* Primary Verdict / KPI Row */}
        {activeSession && (
          <div className="px-5 pb-5 shrink-0 flex flex-col gap-4">
            <h3 className="text-[14px] font-sans font-bold text-text-sub uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-uguisu-light" />
              Primary Verdict & Latency Metrics
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
              <div className="lg:col-span-3">
                <DiagnosticCards 
                  stats={stats} 
                  bottleneck={bottleneck} 
                  counts={activeSession ? activeSession.data.length : 0} 
                  totalObservedStats={totalObservedStats}
                  totalExecuted={totalExecuted}
                  totalFailed={totalFailed}
                  slowestCommand={slowestCommand}
                  retcodeSummary={retcodeSummary}
                />
              </div>
              <div className="lg:col-span-1">
                <LayerLatencyOverview stats={stats} />
              </div>
            </div>
          </div>
        )}

        {/* Command Forensics (contains Visual Diagnostics & Table) */}
        <CommandForensics 
          chains={commandChains} 
          retcodeSummary={retcodeSummary} 
          pollingSummary={pollingSummary} 
          events={activeSession ? activeSession.data : []}
        />

        {/* Evidence Data Table */}
        <MeasuredEvidence evidence={evidence} />

        {/* Upload Overlay (when no logs) */}
        {!activeSession && (
          <div className="absolute inset-0 z-40 bg-black/82 backdrop-blur-[2px] flex flex-col items-center justify-center p-6">
            <div className="bg-dark-card border border-dark-border rounded-[3px] p-10 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
              <div className="w-16 h-16 bg-dark-surface border border-dark-border rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-uguisu-light" />
              </div>
              <h2 className="text-[18px] font-sans font-bold text-text-main mb-2">Upload JSONL Log</h2>
              <p className="text-[14px] font-sans text-text-sub mb-8">Drop a local Synk Mushroom log file to begin analysis</p>
              
              <label className="cursor-pointer px-6 py-2.5 text-[14px] font-sans font-semibold border border-uguisu/20 text-white bg-uguisu hover:bg-uguisu-hover transition-colors rounded-[3px] shadow-sm mb-8">
                Select JSONL File
                <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
              </label>
              
              <div className="grid grid-cols-2 gap-4 w-full text-left">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-sans uppercase tracking-wider text-uguisu-light font-bold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Local Analysis Only</span>
                  <span className="text-[11px] font-sans text-text-muted">No cloud upload. Submission export available after analysis.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-sans uppercase tracking-wider text-text-sub font-bold flex items-center gap-1.5"><FileJson className="w-3.5 h-3.5" /> JSONL Format</span>
                  <span className="text-[11px] font-sans text-text-muted">Zip not supported in this build.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}