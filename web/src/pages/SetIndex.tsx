import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Crown, Flame, Gem, Layers3, Search, Star } from "lucide-react";

import RarityBadge from "@/components/RarityBadge";
import { SET_INDEX, SET_SORTS, rankSets, type SetSortKey } from "@/lib/sets";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Filter = SetSortKey | "all";

const METRIC_META: Record<SetSortKey, { label: string; max: number; format: (n: number) => string; bar: string }> = {
  rarity: { label: "RARE-CARD CONCENTRATION", max: 100, format: (n) => `${n}`, bar: "from-holo-violet to-holo-cyan" },
  demand: { label: "COLLECTOR DEMAND", max: 100, format: (n) => `${n}`, bar: "from-holo-magenta to-holo-gold" },
  rating: { label: "VCA RATING", max: 10, format: (n) => n.toFixed(1), bar: "from-holo-cyan to-holo-mint" },
  value: { label: "AVG TOP-5 VCA-10 VALUE", max: 9500, format: usd, bar: "from-holo-gold to-holo-violet" },
};

export default function SetIndex() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const ranked = useMemo(() => rankSets(filter === "all" ? "rarity" : filter, query), [filter, query]);
  const sortKey: SetSortKey = filter === "all" ? "rarity" : filter;
  const meta = METRIC_META[sortKey];

  const rarest = useMemo(() => rankSets("rarity")[0], []);
  const hottest = useMemo(() => rankSets("demand")[0], []);
  const priciest = useMemo(() => rankSets("value")[0], []);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="holo-frame relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-cyan">
            <Layers3 className="h-3.5 w-3.5" /> VCA SET INDEX
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">Pokémon Set Intelligence</h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/55">
            {SET_INDEX.length} sets indexed by rare-card concentration, collector demand, rating and value — so you know
            which sets are worth hunting before you rip packs.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="glass rounded-2xl p-3">
              <Crown className="h-4 w-4 text-holo-violet" />
              <p className="mt-1.5 truncate font-display text-sm font-extrabold text-white">{rarest.name}</p>
              <p className="text-[10px] text-white/40">Most rare · {rarest.rarityIndex} idx</p>
            </div>
            <div className="glass rounded-2xl p-3">
              <Flame className="h-4 w-4 text-holo-magenta" />
              <p className="mt-1.5 truncate font-display text-sm font-extrabold text-white">{hottest.name}</p>
              <p className="text-[10px] text-white/40">Hottest · {hottest.demandIndex} demand</p>
            </div>
            <div className="glass rounded-2xl p-3">
              <Gem className="h-4 w-4 text-holo-gold" />
              <p className="mt-1.5 truncate font-display text-sm font-extrabold text-white">{priciest.name}</p>
              <p className="text-[10px] text-white/40">Top value · {usd(priciest.avgG10)} avg</p>
            </div>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="ALL SETS" />
          {SET_SORTS.map((s) => (
            <FilterChip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)} label={s.label} />
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets, eras, years…"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/30 focus:border-holo-cyan/50 focus:outline-none"
          />
        </div>
      </div>

      {/* ranked list */}
      <div className="space-y-2.5">
        {ranked.map((s, i) => {
          const metric = METRIC_META[sortKey];
          const value = metric.format(sortKey === "rating" ? s.rating : sortKey === "value" ? s.avgG10 : sortKey === "demand" ? s.demandIndex : s.rarityIndex);
          const raw = sortKey === "rating" ? s.rating : sortKey === "value" ? s.avgG10 : sortKey === "demand" ? s.demandIndex : s.rarityIndex;
          const up = s.trend >= 0;
          return (
            <div
              key={s.id}
              className="glass group rounded-2xl p-4 transition-all hover:border-holo-cyan/30 hover:bg-holo-cyan/4"
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ring-1",
                    i === 0 ? "bg-holo-gold/15 text-holo-gold ring-holo-gold/40" : "bg-white/5 text-white/50 ring-white/10",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base leading-none">{s.symbol}</span>
                    <p className="font-display text-sm font-extrabold text-white">{s.name}</p>
                    <span className="font-mono text-[10px] text-white/35">{s.era} · {s.year}</span>
                    {s.demandIndex >= 90 && (
                      <span className="flex items-center gap-1 rounded-full border border-holo-magenta/40 bg-holo-magenta/10 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-holo-magenta">
                        <Flame className="h-2.5 w-2.5" /> HOT
                      </span>
                    )}
                    {i === 0 && (
                      <span className="flex items-center gap-1 rounded-full border border-holo-gold/40 bg-holo-gold/10 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-holo-gold">
                        <Crown className="h-2.5 w-2.5" /> #1 {filter === "all" ? "RAREST" : "IN FILTER"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">
                    {s.totalCards} cards · {s.rareCount} rare · top card: <span className="font-semibold text-white/70">{s.topCard}</span> {usd(s.topCardValue)}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 group-hover:brightness-125", metric.bar)}
                        style={{ width: `${Math.max((Number(raw) / metric.max) * 100, 6)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[11px] font-bold text-holo-cyan">{value}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/40">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-holo-gold" /> {s.rating.toFixed(1)}/10
                    </span>
                    <span>demand {s.demandIndex}</span>
                    <span className={cn("flex items-center gap-0.5 font-semibold", up ? "text-holo-mint" : "text-red-400")}>
                      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(s.trend)}% 30d
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-white/40">No sets match “{query}”.</div>
        )}
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mb-2 font-display text-[11px] font-bold tracking-wider text-white/70">
          <RarityBadge
            className="mr-2 align-middle"
            tier={{ name: "Legendary", max: Number.POSITIVE_INFINITY, chip: "border-holo-gold/50 bg-holo-gold/12 text-holo-gold" }}
          />
          HOW THE INDEX WORKS
        </p>
        <p className="text-[11px] leading-relaxed text-white/45">
          The rare-card concentration score weighs holo, ultra-rare and full-art slots against total set size. Demand
          blends VCA scanner activity, slab requests and marketplace watch counts. All figures are the platform's own
          aggregated index — estimates for research, not guarantees of market prices.
        </p>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider transition-all active:scale-95",
        active
          ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan shadow-[0_0_14px_rgba(53,182,255,0.3)]"
          : "border-white/10 bg-white/4 text-white/45 hover:border-white/25 hover:text-white/80",
      )}
    >
      {label}
    </button>
  );
}
