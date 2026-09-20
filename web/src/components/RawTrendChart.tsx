import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LivePrices } from "@/lib/prices";
import type { CatalogCard } from "@/lib/types";

const CYAN = "#3D6BE8";
const MINT = "#43F5B0";
const RED = "#FF4D6A";
const DAY = 24 * 60 * 60;

interface RawTrendChartProps {
  card: CatalogCard;
  live?: LivePrices | null;
}

interface TrendDatum {
  t: number;
  value: number;
  label: string;
}

const fmtDate = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const fmtUsd = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(v < 10 ? 2 : 0)}`;

/**
 * Interactive raw-market price trend chart (last 90 days) for the card
 * detail page. Uses live raw price history when available, falls back to the
 * bundled VCA Market Index series (labeled).
 */
export default function RawTrendChart({ card, live }: RawTrendChartProps) {
  const [span, setSpan] = useState<30 | 90>(90);

  const liveRaw = live?.rawHistory ?? [];
  const isLive = liveRaw.length >= 2;

  const { series, canToggle30 } = useMemo(() => {
    if (isLive) {
      const cutoff = Date.now() / 1000 - span * DAY;
      const window = liveRaw.filter((p) => p.t >= cutoff);
      const chosen = window.length >= 2 ? window : liveRaw;
      return {
        series: chosen.map((p) => ({ t: p.t, value: p.p, label: fmtDate(p.t) })) as TrendDatum[],
        canToggle30: liveRaw.filter((p) => p.t >= Date.now() / 1000 - 30 * DAY).length >= 3,
      };
    }
    // Bundled monthly index fallback (no timestamps — index as x).
    return {
      series: card.history.map((h, i) => ({ t: i, value: h.value, label: h.month })) as TrendDatum[],
      canToggle30: false,
    };
  }, [isLive, liveRaw, span, card.history]);

  const stats = useMemo(() => {
    if (!series.length) return null;
    const first = series[0];
    const last = series[series.length - 1];
    const values = series.map((s) => s.value);
    const change = first.value ? ((last.value - first.value) / first.value) * 100 : 0;
    return {
      current: last.value,
      change,
      high: Math.max(...values),
      low: Math.min(...values),
    };
  }, [series]);

  const pad = stats ? Math.max((stats.high - stats.low) * 0.18, stats.low * 0.02, 0.5) : 1;
  const yDomain: [number, number] = stats
    ? [Math.max(0, stats.low - pad), stats.high + pad]
    : [0, 1];

  const metricLabel = isLive
    ? `RAW MARKET · ${canToggle30 ? `${span} DAYS` : "90 DAYS"}`
    : "RAW MARKET · VCA INDEX (MONTHLY)";

  if (!stats) {
    return (
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold tracking-wide text-white/90">
          RAW MARKET TREND · <span className="holo-text">90 DAYS</span>
        </h3>
        <p className="mt-3 text-xs text-white/40">No price history available for this card yet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold tracking-wide text-white/90">
          RAW MARKET TREND · <span className="holo-text">{metricLabel}</span>
        </h3>
        {canToggle30 && (
          <div className="flex gap-1">
            {([30, 90] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpan(s)}
                className={
                  span === s
                    ? "rounded-full border border-holo-cyan/60 bg-holo-cyan/15 px-2.5 py-1 font-mono text-[9px] font-bold text-holo-cyan"
                    : "rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold text-white/50 transition-colors hover:text-white"
                }
              >
                {s}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* stat strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Current</p>
          <p className="font-display text-base font-extrabold text-white">{fmtUsd(stats.current)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Change</p>
          <p className="font-display text-base font-extrabold" style={{ color: stats.change >= 0 ? MINT : RED }}>
            {stats.change >= 0 ? "+" : ""}
            {stats.change.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">High</p>
          <p className="font-display text-base font-extrabold text-holo-gold">{fmtUsd(stats.high)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Low</p>
          <p className="font-display text-base font-extrabold text-white/70">{fmtUsd(stats.low)}</p>
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(96,130,230,0.08)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              tickFormatter={(t: number) =>
                isLive ? fmtDate(t) : (series[Number(t)]?.label ?? "")
              }
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtUsd(v)}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(9,13,22,0.95)",
                border: "1px solid rgba(61,107,232,0.3)",
                borderRadius: 12,
                fontSize: 12,
                color: "#fff",
              }}
              labelFormatter={(_label, payload) =>
                payload?.[0] ? String(payload[0].payload.label) : ""
              }
              formatter={(value: number | string) => [
                `$${Number(value).toLocaleString("en-US")}`,
                "Raw market",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CYAN}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: RED, stroke: "#fff", strokeWidth: 1 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1.5 text-[10px] text-white/35">
        {isLive
          ? `Raw TCGPlayer market series · ${live!.source} · updated ${live!.updatedAt} · hover the line to inspect any day.`
          : `Monthly index from the bundled VCA Market Index · ${card.priceDate} · estimates only, not guaranteed sale prices.`}
      </p>
    </div>
  );
}
