import { useMemo, useState } from "react";

export default function SynkMushroomAnalyze() {
  const [events, setEvents] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [history, setHistory] = useState([]);

  const handleFile = async (file) => {
    if (!file) return;

    const text = await file.text();

    const parsed = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const payload = {
      name: file.name,
      events: parsed,
      loadedAt: new Date().toISOString(),
    };

    setCurrentFile(payload);

    setHistory((prev) => {
      const next = [payload, ...prev.filter((x) => x.name !== file.name)];
      return next.slice(0, 6);
    });

    setEvents(parsed);
  };

  const metrics = useMemo(() => {
    if (!events.length) {
      return {
        avgSynk: 0,
        avgMt5: 0,
        avgTotal: 0,
        successRate: 0,
        bottleneckRate: 0,
      };
    }

    const avg = (arr) =>
      arr.reduce((a, b) => a + b, 0) / arr.length;

    const avgSynk = avg(
      events.map((e) => e.timings?.synk_processing_ms || 0)
    );

    const avgMt5 = avg(
      events.map((e) => e.timings?.mt5_send_ms || 0)
    );

    const avgTotal = avg(
      events.map((e) => e.timings?.total_execution_ms || 0)
    );

    const successRate =
      (events.filter((e) => e.status === "filled").length /
        events.length) *
      100;

    const bottleneckRate =
      (events.filter(
        (e) => e.bottleneck_stage === "mt5_terminal"
      ).length /
        events.length) *
      100;

    return {
      avgSynk: avgSynk.toFixed(1),
      avgMt5: avgMt5.toFixed(1),
      avgTotal: avgTotal.toFixed(1),
      successRate: successRate.toFixed(1),
      bottleneckRate: bottleneckRate.toFixed(1),
    };
  }, [events]);

  const latest = events[events.length - 1];

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="max-w-[1720px] mx-auto px-6 py-5 h-screen flex flex-col gap-4">

        {/* top bar */}
        <div className="h-[76px] shrink-0 rounded-[24px] border border-white/8 bg-[#0b0f17]/90 backdrop-blur-xl px-6 flex items-center justify-between shadow-2xl">

          <div className="flex items-center gap-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">🍄</div>

                <div>
                  <div className="text-[22px] font-semibold tracking-tight">
                    Synk Mushroom Analyze
                  </div>

                  <div className="text-white/35 text-sm">
                    Execution Forensics Tool
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-5 text-sm text-white/45">
              <div>
                Current Log
              </div>

              <div className="text-white font-medium text-base">
                {currentFile?.name || "No log loaded"}
              </div>

              <div>
                {events.length} events
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="h-11 px-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center cursor-pointer text-sm font-medium">
              Upload Log

              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </label>

            <button className="h-11 px-5 rounded-2xl border border-white/10 bg-[#111827] text-sm text-white/60">
              Compare
            </button>
          </div>
        </div>

        {/* hero */}
        <div className="grid grid-cols-[1.3fr_0.7fr] gap-4 shrink-0 h-[240px]">

          <div className="rounded-[32px] border border-orange-500/10 bg-gradient-to-br from-[#111111] via-[#0b0f17] to-[#080808] p-7 shadow-[0_0_80px_rgba(0,0,0,0.55)] relative overflow-hidden">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_35%)]"></div>

            <div className="relative z-10 h-full flex flex-col justify-between">

              <div>
                <div className="text-orange-400/80 text-sm tracking-[0.2em] uppercase mb-4">
                  Analysis Result
                </div>

                <div className="text-[54px] leading-none font-semibold tracking-tight mb-4">
                  MT5 / Broker Delay
                </div>

                <div className="flex items-end gap-4">
                  <div className="text-[92px] leading-[0.9] font-semibold text-orange-300">
                    {metrics.avgMt5}
                  </div>

                  <div className="text-orange-200/60 text-2xl pb-4">
                    ms
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-10 text-sm">
                <div>
                  <div className="text-white/35 mb-1">
                    Synk internal routing
                  </div>

                  <div className="text-emerald-400 text-2xl font-semibold">
                    {metrics.avgSynk}ms
                  </div>
                </div>

                <div>
                  <div className="text-white/35 mb-1">
                    Bottleneck ratio
                  </div>

                  <div className="text-orange-300 text-2xl font-semibold">
                    {metrics.bottleneckRate}%
                  </div>
                </div>

                <div>
                  <div className="text-white/35 mb-1">
                    Status
                  </div>

                  <div className="text-white text-2xl font-semibold capitalize">
                    {latest?.status || "waiting"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* side */}
          <div className="rounded-[32px] border border-white/8 bg-[#0b0f17] p-6 flex flex-col justify-between">

            <div>
              <div className="text-white/40 text-sm mb-5 uppercase tracking-[0.18em]">
                Responsibility Breakdown
              </div>

              <div className="space-y-4">

                <Breakdown
                  label="TradingView → Synk"
                  value={`${metrics.avgSynk}ms`}
                  accent="emerald"
                  width="8%"
                />

                <Breakdown
                  label="MT5 / Broker"
                  value={`${metrics.avgMt5}ms`}
                  accent="orange"
                  width="92%"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <MiniCard
                label="Executions"
                value={events.length}
              />

              <MiniCard
                label="Success"
                value={`${metrics.successRate}%`}
              />

              <MiniCard
                label="Avg Total"
                value={`${metrics.avgTotal}ms`}
              />

              <MiniCard
                label="Current"
                value={latest?.symbol || "-"}
              />
            </div>
          </div>
        </div>

        {/* main */}
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-4 min-h-0 flex-1">

          {/* left */}
          <div className="flex flex-col gap-4 min-h-0">

            <div className="rounded-[30px] border border-white/8 bg-[#0b0f17] p-6 shrink-0">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    Execution Pipeline
                  </div>

                  <div className="text-white/35 mt-1 text-sm">
                    Responsibility boundary visualization
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white/35 text-sm">
                    Total Execution
                  </div>

                  <div className="text-4xl font-semibold text-orange-300">
                    {metrics.avgTotal}ms
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">

                <PipeNode
                  title="Alert"
                  value="0ms"
                  desc="Webhook received"
                  accent="white"
                />

                <PipeNode
                  title="Synk"
                  value={`${latest?.timings?.synk_processing_ms || 0}ms`}
                  desc="Local routing"
                  accent="emerald"
                />

                <PipeNode
                  title="MT5"
                  value={`${latest?.timings?.mt5_send_ms || 0}ms`}
                  desc="Trade server"
                  accent="orange"
                  problem
                />

                <PipeNode
                  title="Filled"
                  value={`${latest?.timings?.total_execution_ms || 0}ms`}
                  desc="Execution complete"
                  accent="cyan"
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_0.8fr] gap-4 min-h-0 flex-1">

              {/* heatmap */}
              <div className="rounded-[30px] border border-white/8 bg-[#0b0f17] p-6 overflow-hidden flex flex-col">

                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div>
                    <div className="text-xl font-semibold">
                      Latency Heatmap
                    </div>

                    <div className="text-white/35 text-sm mt-1">
                      Historical execution density
                    </div>
                  </div>

                  <div className="text-xs text-white/35">
                    0ms → 1000ms+
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-[6px] flex-1">
                  {Array.from({ length: 84 }).map((_, i) => {
                    const colors = [
                      "bg-emerald-500/80",
                      "bg-lime-500/80",
                      "bg-yellow-500/80",
                      "bg-orange-500/80",
                      "bg-red-500/80",
                    ];

                    const c = colors[Math.floor((i % 12) / 3)];

                    return (
                      <div
                        key={i}
                        className={`rounded-md ${c} border border-black/10`}>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* logs */}
              <div className="flex flex-col gap-4 min-h-0">

                <div className="rounded-[30px] border border-white/8 bg-[#0b0f17] p-6 shrink-0">

                  <div className="text-xl font-semibold mb-5">
                    Latest Event
                  </div>

                  <div className="space-y-3 text-sm">
                    <Row
                      label="Symbol"
                      value={latest?.symbol || "-"}
                    />

                    <Row
                      label="Retcode"
                      value={latest?.mt5?.retcode || "-"}
                    />

                    <Row
                      label="Bottleneck"
                      value={latest?.bottleneck_stage || "-"}
                      accent="orange"
                    />
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/8 bg-[#0b0f17] p-6 min-h-0 flex flex-col overflow-hidden">

                  <div className="flex items-center justify-between mb-5 shrink-0">
                    <div>
                      <div className="text-xl font-semibold">
                        Errors
                      </div>

                      <div className="text-white/35 text-sm mt-1">
                        Reject / failure analysis
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 overflow-auto pr-1">
                    {events
                      .filter((e) => e.status !== "filled")
                      .slice(0, 12)
                      .map((e, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-4 flex items-center justify-between gap-4">

                          <div>
                            <div className="font-medium text-sm mb-1">
                              {e.symbol}
                            </div>

                            <div className="text-red-300/80 text-xs">
                              {e.mt5?.comment}
                            </div>
                          </div>

                          <div className="text-white/35 text-sm">
                            {e.mt5?.retcode}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* right side logs */}
          <div className="rounded-[30px] border border-white/8 bg-[#0b0f17] p-6 overflow-hidden flex flex-col">

            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <div className="text-2xl font-semibold">
                  Loaded Sessions
                </div>

                <div className="text-white/35 text-sm mt-1">
                  Compare previous log sessions
                </div>
              </div>
            </div>

            <div className="space-y-3 overflow-auto pr-1">
              {history.map((item, i) => {
                const avg = (
                  item.events.reduce(
                    (a, b) =>
                      a +
                      (b.timings?.total_execution_ms || 0),
                    0
                  ) / item.events.length
                ).toFixed(1);

                return (
                  <div
                    key={i}
                    className="rounded-[24px] border border-white/8 bg-black/20 p-5 hover:bg-white/[0.03] transition cursor-pointer">

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="font-medium text-base mb-1">
                          {item.name}
                        </div>

                        <div className="text-white/35 text-sm">
                          {item.events.length} executions
                        </div>
                      </div>

                      <div className="text-orange-300 text-2xl font-semibold">
                        {avg}ms
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${Math.min(avg / 6, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Breakdown({ label, value, accent, width }) {
  const colors = {
    emerald: "bg-emerald-400",
    orange: "bg-orange-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="text-white/60">{label}</div>
        <div className="font-medium">{value}</div>
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${colors[accent]} rounded-full`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="text-white/35 text-xs mb-2">{label}</div>
      <div className="text-xl font-semibold truncate">{value}</div>
    </div>
  );
}

function PipeNode({ title, value, desc, accent, problem }) {
  const accents = {
    white: "border-white/10 bg-white/5",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    orange: "border-orange-500/20 bg-orange-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
  };

  return (
    <div className="relative">
      <div className={`rounded-[24px] border ${accents[accent]} p-5 h-full`}>

        <div className="flex items-center justify-between mb-4">
          <div className="text-white/40 text-sm">{title}</div>

          {problem && (
            <div className="text-[10px] tracking-[0.18em] text-orange-300 uppercase">
              Delay
            </div>
          )}
        </div>

        <div className="text-3xl font-semibold mb-2">
          {value}
        </div>

        <div className="text-white/35 text-xs">
          {desc}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
      <div className="text-white/35">{label}</div>
      <div className={accent === "orange" ? "text-orange-300" : ""}>
        {value}
      </div>
    </div>
  );
}
