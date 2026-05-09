import { useMemo, useState } from "react";

export default function App() {
  const [events, setEvents] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFile = async (file) => {
    setFileName(file.name);

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

    const synk = avg(
      events.map((e) => e.timings?.synk_processing_ms || 0)
    );

    const mt5 = avg(
      events.map((e) => e.timings?.mt5_send_ms || 0)
    );

    const total = avg(
      events.map((e) => e.timings?.total_execution_ms || 0)
    );

    const success =
      (events.filter((e) => e.status === "filled").length /
        events.length) *
      100;

    const bottleneck =
      (events.filter(
        (e) => e.bottleneck_stage === "mt5_terminal"
      ).length /
        events.length) *
      100;

    return {
      avgSynk: synk.toFixed(1),
      avgMt5: mt5.toFixed(1),
      avgTotal: total.toFixed(1),
      successRate: success.toFixed(1),
      bottleneckRate: bottleneck.toFixed(1),
    };
  }, [events]);

  const latest = events[events.length - 1];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-[1500px] mx-auto px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-3xl">🍄</div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Synk Mushroom Analyze
                </h1>

                <p className="text-white/40 mt-1">
                  Local execution diagnostics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-white/70">
            <button>Analyze</button>
            <button>About</button>
            <button>How to use</button>

            <button className="border border-white/10 rounded-2xl px-5 py-2 bg-white/5 hover:bg-white/10 transition">
              GitHub
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="grid grid-cols-[1.6fr_0.7fr] gap-6 mb-6">

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0]);
            }}
            className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#111111] to-[#080808] p-12 shadow-2xl"
          >
            <div className="text-center">

              <h2 className="text-4xl font-semibold mb-5">
                ログファイルをドラッグ&ドロップしてください
              </h2>

              <p className="text-white/50 mb-10">
                対応形式 : .json / .jsonl
              </p>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 transition px-8 py-4 font-medium">
                ファイルを選択
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    handleFile(e.target.files[0])
                  }
                />
              </label>

              <div className="mt-8 text-sm text-emerald-400">
                ✓ ファイルはブラウザ内で解析されます。アップロードされません。
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0b1220] p-8">

            <h3 className="text-xl font-semibold mb-8">
              ファイル情報
            </h3>

            <div className="space-y-5 text-sm">

              <Info label="ファイル名" value={fileName || "-"} />

              <Info
                label="読み込み件数"
                value={events.length}
              />

              <Info
                label="平均実行時間"
                value={`${metrics.avgTotal} ms`}
              />

              <Info
                label="Synk平均"
                value={`${metrics.avgSynk} ms`}
              />

              <Info
                label="MT5/Broker平均"
                value={`${metrics.avgMt5} ms`}
              />
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-5 gap-5 mb-6">

          <Card
            title="Executions"
            value={events.length}
            sub="Total parsed events"
          />

          <Card
            title="Success Rate"
            value={`${metrics.successRate}%`}
            sub="Filled executions"
            color="emerald"
          />

          <Card
            title="Average Execution"
            value={`${metrics.avgTotal}ms`}
            sub="Total execution"
            color="violet"
          />

          <Card
            title="Average Synk"
            value={`${metrics.avgSynk}ms`}
            sub="Local routing"
            color="cyan"
          />

          <Card
            title="Broker Bottleneck"
            value={`${metrics.bottleneckRate}%`}
            sub="MT5/Broker dominant"
            color="orange"
          />
        </div>

        {/* Main */}
        <div className="grid grid-cols-[1.4fr_0.8fr] gap-6 mb-6">

          {/* Timeline */}
          <div className="rounded-[32px] border border-white/10 bg-[#0b1220] p-8">

            <div className="flex items-center justify-between mb-10">

              <div>
                <h3 className="text-2xl font-semibold">
                  実行タイムライン
                </h3>

                <p className="text-white/40 mt-2">
                  最新 execution の詳細
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 text-emerald-400">
                {latest?.status || "No data"}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-10">

              <Node
                title="Alert受信"
                value="0ms"
              />

              <Node
                title="Synk処理"
                value={`${latest?.timings?.synk_processing_ms || 0}ms`}
                color="cyan"
              />

              <Node
                title="MT5送信"
                value={`${latest?.timings?.mt5_send_ms || 0}ms`}
                color="violet"
              />

              <Node
                title="Broker約定"
                value={`${latest?.timings?.total_execution_ms || 0}ms`}
                color="orange"
              />
            </div>

            <div className="rounded-2xl bg-black/30 border border-white/5 p-6 space-y-4">

              <Detail
                label="Symbol"
                value={latest?.symbol}
              />

              <Detail
                label="Action"
                value={`${latest?.side || "-"} ${latest?.volume || ""}`}
              />

              <Detail
                label="Bottleneck"
                value={latest?.bottleneck_stage}
                accent="orange"
              />

              <Detail
                label="MT5 Retcode"
                value={latest?.mt5?.retcode}
              />

            </div>
          </div>

          {/* Donut */}
          <div className="rounded-[32px] border border-white/10 bg-[#0b1220] p-8">

            <h3 className="text-2xl font-semibold mb-8">
              実行時間の内訳
            </h3>

            <div className="relative w-72 h-72 mx-auto mb-8">

              <div className="absolute inset-0 rounded-full border-[28px] border-orange-400"></div>

              <div className="absolute inset-[30px] rounded-full bg-[#0b1220] flex flex-col items-center justify-center border border-white/10">

                <div className="text-5xl font-semibold">
                  {metrics.avgTotal}
                </div>

                <div className="text-white/40 mt-1">
                  avg ms
                </div>
              </div>
            </div>

            <div className="space-y-5">

              <Legend
                color="bg-cyan-400"
                label="Synk processing"
                value={`${metrics.avgSynk}ms`}
              />

              <Legend
                color="bg-violet-400"
                label="MT5/Broker"
                value={`${metrics.avgMt5}ms`}
              />

            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">

          {/* Heatmap */}
          <div className="rounded-[32px] border border-white/10 bg-[#0b1220] p-8">

            <div className="mb-8">

              <h3 className="text-2xl font-semibold">
                時間帯別 実行ヒートマップ
              </h3>

              <p className="text-white/40 mt-2">
                total_execution_ms
              </p>
            </div>

            <div className="grid grid-cols-12 gap-2">

              {Array.from({ length: 84 }).map((_, i) => {

                const colors = [
                  "bg-emerald-500/70",
                  "bg-lime-500/70",
                  "bg-yellow-500/70",
                  "bg-orange-500/70",
                  "bg-red-500/70",
                ];

                const c =
                  colors[Math.floor((i % 12) / 3)];

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-md ${c}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Errors */}
          <div className="rounded-[32px] border border-white/10 bg-[#0b1220] p-8">

            <div className="flex items-center justify-between mb-8">

              <div>

                <h3 className="text-2xl font-semibold">
                  エラー一覧
                </h3>

                <p className="text-white/40 mt-2">
                  mt5.retcode / reject analysis
                </p>
              </div>

              <button className="text-blue-400">
                Export JSON
              </button>
            </div>

            <div className="space-y-4">

              {events
                .filter((e) => e.status !== "filled")
                .slice(0, 5)
                .map((e, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/5 bg-black/20 p-5 flex items-center justify-between"
                  >

                    <div>

                      <div className="font-medium mb-1">
                        {e.symbol}
                      </div>

                      <div className="text-red-400 text-sm">
                        {e.mt5?.comment}
                      </div>
                    </div>

                    <div className="text-white/40">
                      {e.mt5?.retcode}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  color = "white",
}) {

  const colors = {
    white: "border-white/10",
    emerald: "border-emerald-500/20",
    violet: "border-violet-500/20",
    cyan: "border-cyan-500/20",
    orange: "border-orange-500/20",
  };

  return (
    <div className={`rounded-[28px] border ${colors[color]} bg-[#0b1220] p-7`}>

      <div className="text-white/40 text-sm mb-4">
        {title}
      </div>

      <div className="text-4xl font-semibold mb-2">
        {value}
      </div>

      <div className="text-white/40 text-sm">
        {sub}
      </div>
    </div>
  );
}

function Node({
  title,
  value,
  color = "white",
}) {

  const colors = {
    white: "bg-white/10 border-white/10",
    cyan: "bg-cyan-500/10 border-cyan-500/20",
    violet: "bg-violet-500/10 border-violet-500/20",
    orange: "bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className="text-center">

      <div className={`w-16 h-16 rounded-full border mx-auto mb-4 flex items-center justify-center ${colors[color]}`}>
        ✓
      </div>

      <div className="font-medium mb-2">
        {title}
      </div>

      <div className="text-2xl font-semibold">
        {value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  accent,
}) {

  return (
    <div className="flex items-center justify-between">

      <div className="text-white/40">
        {label}
      </div>

      <div className={accent === "orange" ? "text-orange-400" : ""}>
        {value}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
}) {

  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-3">

        <div className={`w-3 h-3 rounded-full ${color}`}></div>

        <div className="text-white/70">
          {label}
        </div>
      </div>

      <div>
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}) {

  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">

      <div className="text-white/40">
        {label}
      </div>

      <div>
        {value}
      </div>
    </div>
  );
}
