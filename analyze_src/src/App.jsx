import { useState, useCallback, useMemo } from 'react'
import { Upload, FileJson, Clock, Activity, AlertCircle, CheckCircle2, ChevronRight, Zap } from 'lucide-react'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [logs, setLogs] = useState([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState(null)

  const processFile = (file) => {
    setFileName(file.name)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        const parsedLogs = lines.map(line => JSON.parse(line))
        setLogs(parsedLogs)
      } catch (err) {
        setError("Failed to parse JSONL file. Ensure each line is valid JSON.")
      }
    }
    reader.onerror = () => setError("Failed to read file.")
    reader.readAsText(file)
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const metrics = useMemo(() => {
    if (!logs.length) return null

    let totalSynkMs = 0
    let totalMt5Ms = 0
    let totalExecMs = 0
    let successCount = 0
    let errorEvents = []

    logs.forEach(log => {
      totalSynkMs += (log.synk_processing_ms || 0)
      totalMt5Ms += (log.mt5_send_ms || 0)
      totalExecMs += (log.total_execution_ms || 0)
      
      if (log.status === 'success') {
        successCount++
      } else if (log.status === 'error') {
        errorEvents.push(log)
      }
    })

    return {
      count: logs.length,
      avgSynk: (totalSynkMs / logs.length).toFixed(2),
      avgMt5: (totalMt5Ms / logs.length).toFixed(2),
      avgTotal: (totalExecMs / logs.length).toFixed(2),
      successRate: ((successCount / logs.length) * 100).toFixed(1),
      errors: errorEvents
    }
  }, [logs])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-emerald-500" />
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Synk Mushroom Analyze</h1>
              <p className="text-xs text-zinc-500 mt-1">Local Browser Parsing | No Telemetry</p>
            </div>
          </div>
          {fileName && (
            <div className="flex items-center space-x-2 text-sm bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
              <FileJson className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-300 truncate max-w-[200px]">{fileName}</span>
            </div>
          )}
        </header>

        {/* Drag & Drop Zone */}
        {!logs.length && !error && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-12 border-2 border-dashed rounded-lg p-16 text-center transition-colors ${
              isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-emerald-500' : 'text-zinc-600'}`} />
            <h3 className="text-lg font-medium text-zinc-200 mb-2">Drop Execution JSONL Logs</h3>
            <p className="text-sm text-zinc-500 mb-6">File remains in your browser. No data is uploaded.</p>
            
            <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-zinc-950 bg-zinc-200 hover:bg-zinc-300 transition-colors">
              <span>Select File</span>
              <input type="file" className="hidden" accept=".jsonl,.json,.txt" onChange={handleFileInput} />
            </label>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-400">Parse Error</h4>
              <p className="text-sm text-red-400/80 mt-1">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-3 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {metrics && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-zinc-500 text-xs mb-2 flex items-center"><Activity className="w-3.5 h-3.5 mr-1.5"/> Total Events</div>
                <div className="text-3xl font-light text-zinc-100">{metrics.count}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
                <div className="text-zinc-500 text-xs mb-2 flex items-center"><Zap className="w-3.5 h-3.5 mr-1.5"/> Avg Synk Processing</div>
                <div className="text-3xl font-light text-emerald-400">{metrics.avgSynk}<span className="text-sm text-zinc-500 ml-1">ms</span></div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50"></div>
                <div className="text-zinc-500 text-xs mb-2 flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5"/> Avg MT5/Broker Latency</div>
                <div className="text-3xl font-light text-rose-400">{metrics.avgMt5}<span className="text-sm text-zinc-500 ml-1">ms</span></div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-zinc-500 text-xs mb-2 flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> Success Rate</div>
                <div className="text-3xl font-light text-zinc-100">{metrics.successRate}<span className="text-sm text-zinc-500 ml-1">%</span></div>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Timeline Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-300">Execution Timeline</h3>
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Synk (Fast)</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>Broker/MT5 (Bottleneck)</span>
                  </div>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {logs.slice(0, 50).map((log, i) => {
                    // Calculate visual bar widths. Max cap for visual sanity.
                    const maxVisualMs = 500; 
                    const synkMs = Math.min(log.synk_processing_ms || 1, maxVisualMs);
                    const mt5Ms = Math.min(log.mt5_send_ms || 1, maxVisualMs);
                    const totalVisual = synkMs + mt5Ms;
                    
                    const synkPct = (synkMs / maxVisualMs) * 100;
                    const mt5Pct = (mt5Ms / maxVisualMs) * 100;

                    return (
                      <div key={log.event_id || i} className="group flex flex-col space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>{log.event_id || `evt_${i}`} | {log.symbol} | {log.action}</span>
                          <span>{log.total_execution_ms}ms total</span>
                        </div>
                        <div className="flex w-full h-2 bg-zinc-950 rounded overflow-hidden">
                          {/* Synk execution bar (usually very small) */}
                          <div 
                            className="bg-emerald-500 group-hover:brightness-110 transition-all"
                            style={{ width: `${Math.max(synkPct, 0.5)}%` }}
                            title={`Synk: ${log.synk_processing_ms}ms`}
                          ></div>
                          {/* Broker execution bar */}
                          <div 
                            className="bg-rose-500 group-hover:brightness-110 transition-all"
                            style={{ width: `${mt5Pct}%` }}
                            title={`MT5/Broker: ${log.mt5_send_ms}ms`}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                  {logs.length > 50 && (
                    <div className="text-center text-xs text-zinc-600 pt-2 border-t border-zinc-800/50">
                      Showing latest 50 events
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: Details & Errors */}
              <div className="space-y-6">
                
                {/* Heatmap Mock */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                   <h3 className="text-sm font-medium text-zinc-300 mb-3">Latency Distribution</h3>
                   <div className="grid grid-cols-10 gap-1">
                     {Array.from({length: 50}).map((_, i) => {
                        // Generate mock heatmap distribution based on logs
                        const logIndex = i % logs.length;
                        const lat = logs[logIndex]?.total_execution_ms || 0;
                        let bg = 'bg-zinc-800';
                        if (lat > 200) bg = 'bg-rose-500/80';
                        else if (lat > 100) bg = 'bg-amber-500/80';
                        else if (lat > 0) bg = 'bg-emerald-500/80';

                        return <div key={i} className={`aspect-square rounded-[1px] ${bg}`}></div>
                     })}
                   </div>
                   <div className="flex justify-between text-[10px] text-zinc-500 mt-2">
                     <span>Fast</span>
                     <span>Slow</span>
                   </div>
                </div>

                {/* Errors List */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col h-[260px]">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5 text-zinc-500"/> 
                    Errors & Rejects ({metrics.errors.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {metrics.errors.length > 0 ? (
                      metrics.errors.map((err, i) => (
                        <div key={i} className="text-xs bg-zinc-950 p-2 rounded border border-zinc-800/50">
                          <div className="text-red-400 font-medium mb-1">Code: {err?.mt5?.retcode || 'UNKNOWN'}</div>
                          <div className="text-zinc-400 break-words">{err?.mt5?.comment || 'No comment provided'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-600 text-xs text-center">
                        No errors recorded in<br/>this execution log.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-center pt-2">
                  <button 
                    onClick={() => {setLogs([]); setFileName('');}}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Clear Data & Upload New
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
