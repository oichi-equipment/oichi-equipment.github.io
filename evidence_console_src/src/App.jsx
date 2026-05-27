import { useState, useMemo } from 'react';
import { Database, UploadCloud, Shield, FileJson, Download, Activity, Search } from 'lucide-react';
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
import VisualDiagnostics from './components/VisualDiagnostics';
import MeasuredEvidence from './components/MeasuredEvidence';
import LiveSyncHealth from './components/LiveSyncHealth';
import CloseResultTimeline from './components/CloseResultTimeline';
import { extractQuoteForensics } from './utils/quoteForensics';
import { extractProfitForensics } from './utils/profitForensics';
import { extractCloseForensics } from './utils/closeForensics';

const normalizeRotationEnabled = (val) => {
  if (val === true || val === "true") return true;
  if (val === false || val === "false") return false;
  return null;
};

const sortRotationFiles = (a, b) => {
  const parseFilename = (name) => {
    const match = name.match(/events_(\d{8})_(\d{4})-(\d{4})(?:_part(\d+))?\.jsonl/);
    if (!match) return null;
    return {
      date: match[1],
      start: match[2],
      end: match[3],
      part: match[4] ? parseInt(match[4], 10) : 0
    };
  };

  const parsedA = parseFilename(a.name);
  const parsedB = parseFilename(b.name);

  if (parsedA && parsedB) {
    if (parsedA.date !== parsedB.date) return parsedA.date.localeCompare(parsedB.date);
    if (parsedA.start !== parsedB.start) return parsedA.start.localeCompare(parsedB.start);
    if (parsedA.end !== parsedB.end) return parsedA.end.localeCompare(parsedB.end);
    return parsedA.part - parsedB.part;
  }
  
  return a.name.localeCompare(b.name);
};

export default function SynkEvidenceConsole() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingSubmission, setIsGeneratingSubmission] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const fileStats = [];
      const wrapperArray = [];
      let globalIndex = 0;

      // Sort files by rotation naming convention, fallback to alphabetical
      const sortedFiles = Array.from(files).sort(sortRotationFiles);

      for (const file of sortedFiles) {
        const parsedEvents = await parseLogFile(file);
        if (parsedEvents.length > 0) {
          let firstTimestamp = null;
          let lastTimestamp = null;
          const validTimestamps = parsedEvents.map(e => e.timestamp ? new Date(e.timestamp).getTime() : NaN).filter(t => !isNaN(t));
          if (validTimestamps.length > 0) {
            const minT = Math.min(...validTimestamps);
            const maxT = Math.max(...validTimestamps);
            firstTimestamp = new Date(minT).toISOString();
            lastTimestamp = new Date(maxT).toISOString();
          }
          fileStats.push({ name: file.name, count: parsedEvents.length, firstTimestamp, lastTimestamp });
          for (const event of parsedEvents) {
            wrapperArray.push({ event, loadOrder: globalIndex++ });
          }
        }
      }

      if (wrapperArray.length === 0) {
        alert("No valid JSON logs found.");
        setIsUploading(false);
        return;
      }

      // Safe robust sort
      wrapperArray.sort((a, b) => {
        const tA = a.event.timestamp ? new Date(a.event.timestamp).getTime() : NaN;
        const tB = b.event.timestamp ? new Date(b.event.timestamp).getTime() : NaN;
        
        const validA = !isNaN(tA);
        const validB = !isNaN(tB);

        // Both valid -> chronological
        if (validA && validB) {
          if (tA !== tB) return tA - tB;
          return a.loadOrder - b.loadOrder; // fallback to load order
        }
        
        // Invalid/missing goes to the end
        if (validA && !validB) return -1;
        if (!validA && validB) return 1;
        
        // Both invalid -> preserve load order
        return a.loadOrder - b.loadOrder;
      });

      const finalEvents = wrapperArray.map(w => w.event);

      // Extract rotation metadata
      let rotationMetadata = {
        enabled: null,
        status: 'unknown',
        bucket_hours: null,
        max_lines: null,
        max_bytes: null,
        pattern: null,
        active_log_file_name: null,
        rotation_event_count: 0,
        rotation_reason_counts: {}
      };
      
      let source_time_start = null;
      let source_time_end = null;

      if (finalEvents.length > 0) {
        // Find SESSION_SNAPSHOT (usually near the top)
        const snapshot = finalEvents.find(e => e.event_type === 'SESSION_SNAPSHOT');
        if (snapshot && snapshot.payload) {
          const rawEnabled = snapshot.payload.rotation_enabled;
          const normalizedEnabled = normalizeRotationEnabled(rawEnabled);
          
          rotationMetadata.enabled = normalizedEnabled;
          if (normalizedEnabled === true) rotationMetadata.status = 'enabled';
          else if (normalizedEnabled === false) rotationMetadata.status = 'disabled';
          else rotationMetadata.status = 'unknown';

          rotationMetadata.bucket_hours = snapshot.payload.rotation_bucket_hours;
          rotationMetadata.max_lines = snapshot.payload.rotation_max_lines;
          rotationMetadata.max_bytes = snapshot.payload.rotation_max_bytes;
          rotationMetadata.pattern = snapshot.payload.log_pattern;
          rotationMetadata.active_log_file_name = snapshot.payload.active_log_file_name;
        }

        // Count LOG_ROTATE events
        for (const e of finalEvents) {
          if (e.event_type === 'LOG_ROTATE' || (e.event_type === 'SYSTEM' && e.message_type === 'LOG_ROTATE')) {
            rotationMetadata.rotation_event_count++;
            const reason = e.payload?.reason || 'unknown';
            rotationMetadata.rotation_reason_counts[reason] = (rotationMetadata.rotation_reason_counts[reason] || 0) + 1;
          }
        }
        
        // Find time range
        const validTimestamps = finalEvents.map(e => e.timestamp ? new Date(e.timestamp).getTime() : NaN).filter(t => !isNaN(t));
        if (validTimestamps.length > 0) {
          const minT = Math.min(...validTimestamps);
          const maxT = Math.max(...validTimestamps);
          source_time_start = new Date(minT).toISOString();
          source_time_end = new Date(maxT).toISOString();
        }
      }

      const sessionId = `ses_${Date.now().toString().slice(-6)}`;
      const newSession = {
        id: sessionId,
        name: sortedFiles.length > 1 ? `${sortedFiles.length} files selected` : sortedFiles[0].name,
        fileStats,
        isLargeLog: finalEvents.length >= 100000,
        rotationMetadata,
        timeRange: { start: source_time_start, end: source_time_end },
        data: finalEvents
      };

      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error(err);
      alert("Failed to parse log files.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleDownloadSubmission = async () => {
    if (!activeSession || isGeneratingSubmission) return;
    
    setIsGeneratingSubmission(true);
    setSubmissionProgress(0);

    try {
      const ticketMap = new Map();
      let ticketCounter = 1;
      
      const getAnonymousTicket = (ticketValue) => {
        if (ticketValue === null || ticketValue === undefined || ticketValue === '') return ticketValue;
        const key = String(ticketValue);
        if (!ticketMap.has(key)) {
          ticketMap.set(key, `[TICKET_${String(ticketCounter).padStart(3, '0')}]`);
          ticketCounter++;
        }
        return ticketMap.get(key);
      };

      const CHUNK_SIZE = 1000;
      const blobParts = [];
      const totalEvents = activeSession.data.length;

      // Inject SUBMISSION_SOURCE_MANIFEST as the very first event
      const manifestEvent = {
        event_type: "SUBMISSION_SOURCE_MANIFEST",
        message_type: "SUBMISSION_SOURCE_MANIFEST",
        source: "EVIDENCE_CONSOLE",
        timestamp: new Date().toISOString(),
        payload: {
          source_file_count: activeSession.fileStats?.length || 1,
          source_files: activeSession.fileStats ? activeSession.fileStats.map(fs => fs.name) : [activeSession.name],
          source_event_count: totalEvents, // Does not include this manifest
          source_time_start: activeSession.timeRange?.start || null,
          source_time_end: activeSession.timeRange?.end || null,
          rotation_enabled: activeSession.rotationMetadata?.enabled ?? null,
          rotation_status: activeSession.rotationMetadata?.status || "unknown",
          rotation_bucket_hours: activeSession.rotationMetadata?.bucket_hours || null,
          rotation_max_lines: activeSession.rotationMetadata?.max_lines || null,
          rotation_max_bytes: activeSession.rotationMetadata?.max_bytes || null,
          rotation_event_count: activeSession.rotationMetadata?.rotation_event_count || 0,
          rotation_reason_counts: activeSession.rotationMetadata?.rotation_reason_counts || {},
          submission_created_at: new Date().toISOString(),
          ticket_masking_policy: "sequential_alias_per_submission_v1",
          ticket_alias_prefix: "TICKET",
          ticket_alias_scope: "submission",
          raw_ticket_included: false,
          ticket_last4_included: false,
          lock_key_ticket_masking: "embedded_ticket_alias_v1",
          account_display_masking: "account_number_only_v1",
          broker_name_included: true,
          account_number_included: false,
          support_full_evidence: false,
          panel_visual_ticket_semantics: "panel_visual_diff_not_mt5_execution",
          mt5_execution_ticket_sources: [
            "MT5_REQUEST.ticket",
            "MT5_RESPONSE.ticket",
            "COMMAND_RESULT.ticket",
            "ticket_results[].ticket",
            "payload.order_req.position",
            "payload.order_req.order"
          ],
          panel_visual_ticket_sources: [
            "FINAL_RENDER.added_tickets",
            "FINAL_RENDER.removed_tickets"
          ],
          ui_operation_ticket_sources: [
            "USER_ACTION.extraData.ticket"
          ]
        }
      };
      blobParts.push(JSON.stringify(manifestEvent));

      for (let i = 0; i < totalEvents; i += CHUNK_SIZE) {
        const chunkEvents = activeSession.data.slice(i, i + CHUNK_SIZE);

        const submissionData = chunkEvents.map(event => {
          // 1. Deep copy to avoid mutating activeSession.data
          const copy = JSON.parse(JSON.stringify(event));

          // 2. Anonymize ticket/position_ticket/order and PF-4 visual ticket arrays
          const ticketArrayKeys = new Set(['added_tickets', 'removed_tickets']);
          const isTicketScalar = (value) => (
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') &&
            value !== ''
          );
          const isOrderRequestPositionPath = (path, key) => (
            key.toLowerCase() === 'position' &&
            path.length > 0 &&
            String(path[path.length - 1]).toLowerCase() === 'order_req'
          );
          const anonymizeLockKey = (value) => {
            if (typeof value !== 'string') return value;
            const match = value.match(/^(pos|ticket|close)_(\d+)$/i);
            if (!match) return value;
            return `${match[1]}_${getAnonymousTicket(match[2])}`;
          };
          const walkAndAnonymize = (obj, path = []) => {
            if (obj === null || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              const arrayKey = path.length > 0 ? String(path[path.length - 1]).toLowerCase() : '';
              if (ticketArrayKeys.has(arrayKey)) {
                for (let idx = 0; idx < obj.length; idx++) {
                  if (isTicketScalar(obj[idx])) {
                    obj[idx] = getAnonymousTicket(obj[idx]);
                  } else {
                    walkAndAnonymize(obj[idx], path.concat(idx));
                  }
                }
                return;
              }
              obj.forEach((item, idx) => walkAndAnonymize(item, path.concat(idx)));
              return;
            }
            for (const [k, v] of Object.entries(obj)) {
              if (v === null || v === undefined) continue;
              
              const lowerK = k.toLowerCase();
              const isTargetKey = lowerK === 'ticket' || lowerK === 'position_ticket' || lowerK === 'order';
              const isTargetPosition = isOrderRequestPositionPath(path, k);
              
              if (lowerK === 'lockkey' && typeof v === 'string') {
                obj[k] = anonymizeLockKey(v);
              } else if ((isTargetKey || isTargetPosition) && isTicketScalar(v)) {
                obj[k] = getAnonymousTicket(v);
              } else if (typeof v === 'object') {
                walkAndAnonymize(v, path.concat(k));
              }
            }
          };
          walkAndAnonymize(copy);

          // 3. Mask sensitive fields
          const maskedEvent = maskForSubmission(copy);

          // 4. Clean up internal parser artifacts
          for (const k of Object.keys(maskedEvent)) {
            if (k.startsWith('normalized_') || k.startsWith('calculated_')) {
              delete maskedEvent[k];
            }
          }

          return maskedEvent;
        });
        
        // Convert chunk to JSONL
        let chunkString = submissionData.map(ev => JSON.stringify(ev)).join('\n');
        
        // ----------------------------------------------------------------
        // VALUE-BASED STRING REPLACEMENT FOR ABSOLUTE SAFETY
        // Replace all known path patterns directly in the chunk string
        // ----------------------------------------------------------------
        
        // Windows paths (C:\..., C:/...)
        chunkString = chunkString.replace(/(["']?)(?:[A-Z]:\\\\|[A-Z]:\/).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');
        
        // Common directories
        chunkString = chunkString.replace(/(["']?).*?(?:\\\\Users\\\\|\/Users\/|Documents\\\\SynkMushroom|Documents\/SynkMushroom).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');
        
        // Unix/Mac paths
        chunkString = chunkString.replace(/(["']?)(?:\/home\/|\/mnt\/|\/var\/|\/tmp\/).*?(["']?)(?=[,}])/gi, '$1[MASKED_LOCAL_PATH]$2');

        // Quick post-mask validation
        const suspiciousPatterns = [
          /[A-Z]:\\\\/i, /[A-Z]:\//i, /\\\\Users\\\\/i, /\/Users\//i, 
          /Documents\\\\SynkMushroom/i, /Documents\/SynkMushroom/i,
          /SynkMushroom\\\\logs/i, /SynkMushroom\/logs/i,
          /"log_path"\s*:\s*"(?!\[MASKED_LOCAL_PATH\])[^"]+"/i,
          /"balance"\s*:/i, /"equity"\s*:/i, /"profit"\s*:/i
        ];
        
        for (const regex of suspiciousPatterns) {
          if (regex.test(chunkString)) {
            console.warn(`[Synk Warning] Potential unmasked sensitive data detected matching: ${regex}`);
            // Force replace if anything slipped through matching C:\ or similar
            if (/[A-Z]:\\\\/i.test(chunkString) || /[A-Z]:\//i.test(chunkString)) {
               chunkString = chunkString.replace(/"[^"]*?[A-Z]:(?:\\\\|\/)[^"]*?"/gi, '"[MASKED_LOCAL_PATH]"');
            }
          }
        }
        
        if (blobParts.length > 0) {
          blobParts.push('\n' + chunkString);
        } else {
          blobParts.push(chunkString);
        }

        const processed = Math.min(i + CHUNK_SIZE, totalEvents);
        const percent = Math.floor((processed / totalEvents) * 100);
        setSubmissionProgress(percent);

        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      const blob = new Blob(blobParts, { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `synk-evidence-console-submission-log-${activeSession.name}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Failed to generate submission log:", err);
      alert("Failed to generate submission log. See console for details.");
    } finally {
      setIsGeneratingSubmission(false);
      setSubmissionProgress(0);
    }
  };

  const { stats, bottleneck, evidence, commandChains, retcodeSummary, pollingSummary, totalObservedStats, totalExecuted, totalFailed, slowestCommand, quoteForensics, profitForensics, closeForensics } = useMemo(() => {
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
        slowestCommand: null,
        quoteForensics: null,
        profitForensics: null,
        closeForensics: null
      };
    }
    
    const chains = extractCommandChains(activeSession.data);
    const tradeChains = chains.filter(c => c.type === 'Trade');

    const latencies = extractLatencies(activeSession.data);
    
    const coreExecutionLats = tradeChains
      .map(c => c.latencies.coreExecution)
      .filter(val => typeof val === 'number' && !isNaN(val));

    const postExecutionLats = tradeChains
      .map(c => c.latencies.postExecution)
      .filter(val => typeof val === 'number' && !isNaN(val));
    
    const aggregatedStats = {
      wsTransport: calculateStats(latencies.wsTransport),
      mt5Execution: calculateStats(latencies.mt5Execution),
      render: calculateStats(latencies.render),
      statusBuild: calculateStats(latencies.statusBuild),
      coreExecution: calculateStats(coreExecutionLats),
      postExecution: calculateStats(postExecutionLats)
    };

    const primaryBottleneck = determinePrimaryBottleneck(aggregatedStats);
    const measuredEvidence = extractMeasuredEvidence(activeSession.data);
    
    const retcodes = extractRetcodeSummary(activeSession.data);
    const polling = extractPollingSummary(chains);

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

    const quoteForensics = extractQuoteForensics(activeSession.data);
    const profitForensics = extractProfitForensics(activeSession.data);
    const closeForensics = extractCloseForensics(activeSession.data);

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
      slowestCommand: slowest,
      quoteForensics,
      profitForensics,
      closeForensics
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
            <img src="/evidence-console/logo-mark.png" alt="Synk Mushroom" className="w-6 h-6 object-contain" />
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-text-main tracking-tight leading-none mb-1">Synk Evidence Console</span>
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
          <div className="flex items-center gap-3 text-[12px] font-sans tracking-wider uppercase text-[#a1a1aa] border-r border-dark-border pr-4 hidden md:flex">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-uguisu-light/80"/> Privacy Aware</span>
            <span className="flex items-center gap-1.5"><FileJson className="w-3.5 h-3.5 text-[#a1a1aa]"/> JSONL Only</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <button 
                onClick={handleDownloadSubmission}
                disabled={isGeneratingSubmission}
                className={`px-4 py-2 text-[13px] font-sans font-semibold border flex items-center gap-2 transition-colors rounded-[3px] shadow-sm ${
                  isGeneratingSubmission
                    ? 'border-dark-border text-text-muted bg-dark-base cursor-not-allowed'
                    : 'border-dark-border text-[#a1a1aa] hover:text-text-main bg-dark-card hover:bg-dark-hover hover:border-uguisu/40'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                {isGeneratingSubmission ? `Preparing... ${submissionProgress}%` : 'Download Submission Log'}
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
        {/* C. Primary Observations / KPI Row */}
        <div className="px-5 pt-5 pb-0 shrink-0 flex flex-col gap-4">
          <div className="flex flex-col">
            <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-uguisu-light" />
              Primary Observations & Latency Metrics
            </h3>
            <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
              Overall diagnosis based on measured command latency.
            </p>
          </div>
          
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

        {/* Live Sync Health */}
        {activeSession && quoteForensics && profitForensics && closeForensics && (
          <LiveSyncHealth 
            quoteStats={quoteForensics} 
            profitStats={profitForensics} 
            closeStats={closeForensics} 
          />
        )}

        {/* Session / Environment Context */}
        <EnvironmentBoundaryStrip 
          events={activeSession ? activeSession.data : []} 
          fileName={activeSession ? activeSession.name : ''}
          fileStats={activeSession ? activeSession.fileStats : undefined}
          isLargeLog={activeSession ? activeSession.isLargeLog : false}
          rotationMetadata={activeSession ? activeSession.rotationMetadata : undefined}
        />

        {/* Layer Latency Breakdowns */}
        {activeSession && (
          <div className="px-5 pb-5 shrink-0 flex flex-col">
            <LayerLatencyOverview stats={stats} />
          </div>
        )}

        {/* D. Visual Diagnostics */}
        {activeSession && (
          <div className="px-5 pb-5 shrink-0 flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-uguisu-light" />
                Visual Diagnostics
              </h3>
              <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
                Trends, distributions, and activity density derived from command logs.
              </p>
            </div>
            <VisualDiagnostics 
              chains={commandChains} 
              retcodeSummary={retcodeSummary} 
              events={activeSession ? activeSession.data : []} 
              stats={stats}
              totalObservedStats={totalObservedStats}
            />
          </div>
        )}

        {/* E. Command Forensics (contains Visual Diagnostics & Table) */}
        {activeSession && (
          <div className="px-5 pb-5 shrink-0 flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-uguisu-light" />
                Command Forensics
              </h3>
              <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
                Per-command timing breakdown and dominant layer analysis.
              </p>
            </div>
            <CommandForensics 
              chains={commandChains} 
              retcodeSummary={retcodeSummary} 
              pollingSummary={pollingSummary} 
              events={activeSession ? activeSession.data : []}
            />
          </div>
        )}

        {/* Close Result Timeline */}
        {activeSession && closeForensics && (
          <CloseResultTimeline closeForensics={closeForensics} />
        )}

        {/* F. Evidence Data Table */}
        {activeSession && (
          <div className="px-5 pb-5 shrink-0 flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="text-[16px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-uguisu-light" />
                Measured Evidence
              </h3>
              <p className="text-[13px] font-sans text-[#b5b5b5] mt-1">
                Event-derived values used as diagnostic evidence.
              </p>
            </div>
            <MeasuredEvidence evidence={evidence} />
          </div>
        )}

        {/* Upload Overlay (when no logs) */}
        {!activeSession && (
          <div className="absolute inset-0 z-40 bg-black/82 backdrop-blur-[2px] flex flex-col items-center justify-center p-6">
            <div className="bg-dark-card border border-dark-border rounded-[3px] p-10 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
              <div className="w-16 h-16 bg-dark-surface border border-dark-border rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-uguisu-light" />
              </div>
              <h2 className="text-[18px] font-sans font-bold text-text-main mb-2">Upload JSONL Log</h2>
              <p className="text-[14px] font-sans text-text-sub mb-8">Drop a local Synk Mushroom log file to begin analysis</p>
              
              <label className="cursor-pointer px-6 py-2.5 text-[14px] font-sans font-semibold border border-uguisu/20 text-white bg-uguisu hover:bg-uguisu-hover transition-colors rounded-[3px] shadow-sm mb-4">
                Select JSONL File
                <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => handleFileUpload(e.target.files)} />
              </label>

              <div className="flex flex-col items-center mb-8">
                <span className="text-[12px] font-sans text-text-sub">Logs are usually saved under:</span>
                <span className="text-[13px] font-mono text-text-main bg-dark-base px-3 py-1 rounded-[3px] border border-dark-border mt-1.5 shadow-inner">
                  Documents / SynkMushroom / logs
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full text-left">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-sans uppercase tracking-wider text-uguisu-light font-bold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Local Analysis Only</span>
                  <span className="text-[11px] font-sans text-[#a1a1aa]">No cloud upload. Submission export available after analysis.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-sans uppercase tracking-wider text-text-sub font-bold flex items-center gap-1.5"><FileJson className="w-3.5 h-3.5" /> JSONL Format</span>
                  <span className="text-[11px] font-sans text-[#a1a1aa]">Zip not supported in this build.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
