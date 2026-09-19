import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gem, Grid3x3, Heart, LayoutGrid, Plus, Rows3, ScanLine, Star, Wallet } from "lucide-react";

import CardArt from "@/components/CardArt";
import { cardById } from "@/lib/data";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "binder" | "gallery";
type Filter = "all" | "raw" | "graded" | "favorites" | "wishlist" | "slabbed";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "raw", label: "Raw" },
  { id: "graded", label: "Graded" },
  { id: "slabbed", label: "Slabbed" },
  { id: "favorites", label: "Favorites" },
  { id: "wishlist", label: "Wishlist" },
];

export default function Collection() {
  const navigate = useNavigate();
  const { myItems, collectionValue, toggleFavorite, toggleWishlistItem, cardById } = useVca();
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    const all = myItems();
    switch (filter) {
      case "raw":
        return all.filter((i) => !i.grade);
      case "graded":
        return all.filter((i) => i.grade);
      case "slabbed":
        return all.filter((i) => i.slab === "digital" || i.slab === "physical");
      case "favorites":
        return all.filter((i) => i.favorite);
      case "wishlist":
        return all.filter((i) => i.wishlist);
      default:
        return all;
    }
  }, [myItems, filter]);

  const g = (label: string) => myItems().filter((i) => i.grade === label).length;

  const itemValue = (grade: string | null, cardId: string) => {
    const card = cardById(cardId);
    if (!card) return 0;
    if (grade === "VCA 10") return card.prices.g10;
    if (grade === "VCA 9") return card.prices.g9;
    if (grade === "VCA 8") return card.prices.g8;
    return card.prices.raw;
  };

  return (
    <div className="space-y-5">
      {/* header + stats */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">
            My <span className="holo-text">Collection</span>
          </h1>
          <p className="text-[11px] text-white/40">Every card, every grade, one dashboard</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/scanner")}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-3.5 py-2 text-[11px] font-bold text-void transition-transform active:scale-95"
          >
            <ScanLine className="h-3.5 w-3.5" /> Scan
          </button>
          <Link
            to="/slab-creator"
            className="flex items-center gap-1.5 rounded-full border border-holo-magenta/30 bg-holo-magenta/10 px-3.5 py-2 text-[11px] font-bold text-holo-magenta transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Create Slab
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="glass rounded-2xl p-3.5">
          <Wallet className="h-4 w-4 text-holo-gold" />
          <p className="mt-2 font-display text-lg font-extrabold text-white">{usd(collectionValue())}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Total Value</p>
        </div>
        <div className="glass rounded-2xl p-3.5">
          <Grid3x3 className="h-4 w-4 text-holo-cyan" />
          <p className="mt-2 font-display text-lg font-extrabold text-white">{myItems().length}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Tracked Cards</p>
        </div>
        <div className="glass rounded-2xl p-3.5">
          <Gem className="h-4 w-4 text-holo-gold" />
          <p className="mt-2 font-display text-lg font-extrabold text-white">{g("VCA 10")}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">VCA 10</p>
        </div>
        <div className="glass rounded-2xl p-3.5">
          <Gem className="h-4 w-4 text-holo-cyan" />
          <p className="mt-2 font-display text-lg font-extrabold text-white">{g("VCA 9")}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">VCA 9</p>
        </div>
        <div className="glass col-span-2 rounded-2xl p-3.5 sm:col-span-1">
          <Gem className="h-4 w-4 text-holo-violet" />
          <p className="mt-2 font-display text-lg font-extrabold text-white">{g("VCA 8")}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">VCA 8</p>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all",
                filter === f.id ? "bg-holo-cyan/20 text-holo-cyan ring-1 ring-holo-cyan/40" : "glass text-white/45 hover:text-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="glass flex rounded-full p-1">
          {(
            [
              ["grid", LayoutGrid],
              ["binder", Rows3],
              ["gallery", Grid3x3],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={cn("rounded-full p-1.5 transition-all", view === v ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/40 hover:text-white")}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* GRID VIEW */}
      {view === "grid" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const card = cardById(item.cardId);
            if (!card) return null;
            return (
              <div key={item.id} className="group relative">
                <CardArt card={card} grade={item.grade} serial={item.serial} onClick={() => navigate(`/card/${card.id}`)} />
                <p className="mt-1.5 truncate px-0.5 text-center font-mono text-[10px] font-bold text-holo-cyan">{usd(itemValue(item.grade, item.cardId))}</p>
                <div className="absolute right-1.5 top-1.5 z-30 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    aria-label="Toggle favorite"
                    className={cn("rounded-full bg-void/80 p-1.5 backdrop-blur", item.favorite ? "text-holo-magenta" : "text-white/50 hover:text-white")}
                  >
                    <Heart className={cn("h-3 w-3", item.favorite && "fill-holo-magenta")} />
                  </button>
                  <button
                    onClick={() => toggleWishlistItem(item.id)}
                    aria-label="Toggle wishlist"
                    className={cn("rounded-full bg-void/80 p-1.5 backdrop-blur", item.wishlist ? "text-holo-gold" : "text-white/50 hover:text-white")}
                  >
                    <Star className={cn("h-3 w-3", item.wishlist && "fill-holo-gold")} />
                  </button>
                </div>
                {item.favorite && (
                  <span className="absolute left-1.5 top-1.5 z-20 rounded-full bg-void/80 p-1.5 backdrop-blur">
                    <Heart className="h-3 w-3 fill-holo-magenta text-holo-magenta" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BINDER VIEW */}
      {view === "binder" && (
        <div className="space-y-4">
          {Array.from({ length: Math.ceil(items.length / 4) }).map((_, page) => (
            <div key={page} className="glass relative overflow-hidden rounded-3xl p-4">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/10" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-void ring-1 ring-white/15" />
              <div className="grid grid-cols-2 gap-4">
                {items.slice(page * 4, page * 4 + 4).map((item) => {
                  const card = cardById(item.cardId);
                  if (!card) return null;
                  return (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-black/30 p-3">
                      <CardArt card={card} grade={item.grade} serial={item.serial} onClick={() => navigate(`/card/${card.id}`)} />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="truncate text-[11px] font-bold text-white/85">{card.name}</p>
                        <p className="font-mono text-[10px] font-bold text-holo-cyan">{usd(itemValue(item.grade, item.cardId))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center font-mono text-[9px] tracking-[0.3em] text-white/25">PAGE {page + 1}</p>
            </div>
          ))}
        </div>
      )}

      {/* GALLERY VIEW */}
      {view === "gallery" && (
        <div className="space-y-4">
          {items.map((item) => {
            const card = cardById(item.cardId);
            if (!card) return null;
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/card/${card.id}`)}
                className="glass group flex cursor-pointer flex-col gap-4 overflow-hidden rounded-3xl p-4 transition-colors hover:border-holo-cyan/30 sm:flex-row sm:items-center"
              >
                <div className="w-36 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]">
                  <CardArt card={card} grade={item.grade} showMeta={false} interactive={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] font-bold tracking-[0.25em] text-holo-cyan">
                    {item.slab === "physical" ? "PHYSICAL NFC SLAB" : item.slab === "digital" ? "DIGITAL SLAB" : item.grade ? "GRADED · RAW LOCKED" : "RAW"}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-extrabold text-white">{card.name}</h3>
                  <p className="text-xs text-white/45">
                    {card.set} · {card.number} · {card.rarity} · {card.year}
                  </p>
                  {item.serial && <p className="mt-1 font-mono text-[10px] text-holo-cyan/80">{item.serial}</p>}
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-extrabold text-holo-gold">{usd(itemValue(item.grade, item.cardId))}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Estimated · {card.priceDate}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <ScanLine className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm font-bold text-white/70">Nothing here yet</p>
          <p className="mt-1 text-xs text-white/40">Scan a card or adjust your filters.</p>
          <button onClick={() => navigate("/scanner")} className="mt-4 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-xs font-bold text-void">
            Open Scanner
          </button>
        </div>
      )}
    </div>
  );
}
