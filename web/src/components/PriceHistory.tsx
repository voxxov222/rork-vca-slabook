import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LivePrices } from "@/lib/prices";
import type { CatalogCard } from "@/lib/types";

interface PriceHistoryProps {
  card: CatalogCard;
  live?: LivePrices | null;
}

export default function PriceHistory({ card, live }: PriceHistoryProps) {
  const useLive = Boolean(live?.history && live.history.length > 1);
  const data = useLive
    ? live!.history.map((pt) => ({
        month: new Date(pt.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: pt.p,
      }))
    : card.history;
  const metric = 'PSA 10 COMPARISON';
  if (!useLive) return <section className="glass rounded-2xl p-5"><h3 className="font-bold">PSA price history</h3><p className="mt-3 text-sm text-muted-foreground">No reliable history is available for this printing. No synthetic trend is shown.</p></section>;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold tracking-wide text-white/90">
          PRICE HISTORY · <span className="holo-text">{metric}</span>
        </h3>
        <span className="font-mono text-[10px] text-white/40">{useLive ? "recent days" : "8 months"}</span>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D6BE8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3D6BE8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(96,130,230,0.08)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip
              contentStyle={{
                background: "rgba(9,13,22,0.95)",
                border: "1px solid rgba(61,107,232,0.3)",
                borderRadius: 12,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(value: number | string) => [`$${Number(value).toLocaleString("en-US")}`, metric]}
            />
            <Area type="monotone" dataKey="value" stroke="#3D6BE8" strokeWidth={2} fill={`url(#grad-${card.id})`} dot={false} activeDot={{ r: 4, fill: "#FF4D6A" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-white/35">
        {useLive
          ? `Live market data · JustTCG · updated ${live!.updatedAt} · estimates only, not guaranteed sale prices`
          : `History shown when reliable sales data is available · VCA Market Index · ${card.priceDate}`}
      </p>
    </div>
  );
}
