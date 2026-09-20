import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Gem,
  Image,
  Layers,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import HoloSlab, { type SlabConfig } from "@/components/HoloSlab";
import PostCard from "@/components/PostCard";
import { cardById } from "@/lib/data";
import { useVca } from "@/lib/store";
import type { CatalogCard, CollectionItem, GradeLabel, SlabRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const slabValueOf = (card: CatalogCard | undefined, grade: GradeLabel | null): number => {
  if (!card) return 0;
  if (grade === "VCA 10") return card.prices.g10;
  if (grade === "VCA 9") return card.prices.g9;
  if (grade === "VCA 8") return card.prices.g8;
  return card.prices.raw;
};

/** Eased count-up for the hero vault value. */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

type Tab = "portfolio" | "feed" | "saved";

export default function Slabook() {
  const { posts, currentUser, myItems, cardById, addPost, slabs } = useVca();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("portfolio");
  const [draft, setDraft] = useState("");
  const [attachId, setAttachId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = myItems();
  const saved = posts.filter((p) => p.saved);

  const publish = () => {
    if (!draft.trim() && !attachId) return;
    const card = attachId ? cardById(attachId) : undefined;
    addPost(draft.trim() || "New card in the collection ✨", card ? { cardId: card.id, grade: null, serial: null, caption: "NEW ADDITION" } : undefined);
    setDraft("");
    setAttachId(null);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">
            <span className="holo-text">Slabook</span>
          </h1>
          <p className="text-[11px] text-white/40">Your vault, your network</p>
        </div>
        <div className="glass flex rounded-full p-1">
          {(
            [
              ["portfolio", <Wallet key="w" className="h-3 w-3" />],
              ["feed", <Sparkles key="s" className="h-3 w-3" />],
              ["saved", <Bookmark key="b" className="h-3 w-3" />],
            ] as const
          ).map(([id, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all",
                tab === id ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/45 hover:text-white",
              )}
            >
              {icon}
              {id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {tab === "portfolio" && <PortfolioDashboard slabs={slabs} items={items} />}

      {tab === "feed" && (
        <>
          {/* composer */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Avatar displayName={currentUser.displayName} hue={currentUser.avatarHue} />
              <div className="min-w-0 flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Share a pull, a grade, or a slab…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
                />
                {attachId && cardById(attachId) && (
                  <div className="relative mt-2 w-24">
                    <CardArt card={cardById(attachId)!} showMeta={false} interactive={false} />
                    <button
                      onClick={() => setAttachId(null)}
                      className="absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full bg-void text-[10px] text-white/70 ring-1 ring-white/25"
                      aria-label="Remove attached card"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPickerOpen((o) => !o)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                        pickerOpen ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/50 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Image className="h-3.5 w-3.5" /> Attach card
                    </button>
                    <Link to="/scanner" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white/50 transition-colors hover:bg-white/5 hover:text-white">
                      <ScanLine className="h-3.5 w-3.5" /> Scan
                    </Link>
                  </div>
                  <button
                    onClick={publish}
                    disabled={!draft.trim() && !attachId}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-1.5 text-[11px] font-bold text-void transition-all hover:brightness-110 disabled:opacity-40"
                  >
                    <Send className="h-3 w-3" /> Post
                  </button>
                </div>
                {pickerOpen && (
                  <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-void/60 p-2.5 no-scrollbar">
                    {items.map((i) => {
                      const c = cardById(i.cardId);
                      if (!c) return null;
                      return (
                        <button
                          key={i.id}
                          onClick={() => {
                            setAttachId(c.id);
                            setPickerOpen(false);
                          }}
                          className={cn("w-20 shrink-0 rounded-lg ring-offset-2 ring-offset-void transition-all", attachId === c.id ? "ring-2 ring-holo-cyan" : "hover:ring-1 hover:ring-white/30")}
                        >
                          <CardArt card={c} grade={i.grade} showMeta={false} interactive={false} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* feed */}
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}

      {tab === "saved" && (
        <div className="space-y-4">
          {saved.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {saved.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Bookmark className="mx-auto h-6 w-6 text-white/25" />
              <p className="mt-2 text-xs text-white/40">No saved posts yet — tap the bookmark on any post to keep it here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Portfolio dashboard — official VCA graded slabs + holdings        */
/* ---------------------------------------------------------------- */

function PortfolioDashboard({ slabs, items }: { slabs: SlabRecord[]; items: CollectionItem[] }) {
  const { cardById } = useVca();
  const navigate = useNavigate();

  const digitalSlabs = useMemo(() => slabs.filter((s) => s.kind === "digital" && Boolean(cardById(s.cardId))), [slabs, cardById]);
  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const safeIdx = Math.min(showcaseIdx, Math.max(0, digitalSlabs.length - 1));
  const featured = digitalSlabs[safeIdx];
  const featuredCard = featured ? cardById(featured.cardId) : undefined;

  const vaultValue = useMemo(() => slabs.reduce((sum, s) => sum + slabValueOf(cardById(s.cardId), s.grade), 0), [slabs, cardById]);
  const counted = useCountUp(vaultValue);
  const g10 = slabs.filter((s) => s.grade === "VCA 10").length;
  const graded = slabs.filter((s) => s.grade).length;

  /* grade distribution for the animated bars */
  const dist = useMemo(() => {
    const rows = [
      { label: "VCA 10 · Gem Mint", count: slabs.filter((s) => s.grade === "VCA 10").length, bar: "from-holo-gold to-holo-violet", text: "text-holo-gold" },
      { label: "VCA 9 · Mint", count: slabs.filter((s) => s.grade === "VCA 9").length, bar: "from-holo-cyan to-holo-violet", text: "text-holo-cyan" },
      { label: "VCA 8 · Near Mint", count: slabs.filter((s) => s.grade === "VCA 8").length, bar: "from-holo-violet to-holo-magenta", text: "text-holo-violet" },
      { label: "Awaiting grade", count: slabs.filter((s) => !s.grade).length, bar: "from-white/40 to-white/20", text: "text-white/50" },
    ];
    const total = Math.max(1, slabs.length);
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / total) * 100) }));
  }, [slabs]);

  const [barsIn, setBarsIn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBarsIn(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const slabConfig: SlabConfig = {
    labelStyle: featured?.grade === "VCA 10" ? "gold" : "classic",
    holo: 72,
    environment: "void",
    lightTint: "#3D6BE8",
    cardOffset: 0,
    showGrade: true,
    autoSpin: true,
  };

  return (
    <div className="space-y-5">
      {/* hero dashboard */}
      <section className="holo-frame animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="pointer-events-none absolute -left-10 -bottom-14 h-44 w-44 animate-float rounded-full bg-holo-gold/10 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> OFFICIAL VCA GRADED PORTFOLIO
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{usd(counted)}</span>
            <span className="mb-1 rounded-full bg-holo-mint/15 px-2 py-0.5 font-mono text-[9px] font-bold text-holo-mint">VAULT VALUE · EST</span>
          </div>
          <p className="mt-1.5 text-[11px] text-white/45">
            Aggregated across {slabs.length} minted slab{slabs.length === 1 ? "" : "s"} · Estimated market value, not a guaranteed sale price
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icon: Layers, label: "Digital Slabs", value: String(digitalSlabs.length), accent: "text-holo-magenta" },
              { icon: Gem, label: "Gem Mint 10", value: String(g10), accent: "text-holo-gold" },
              { icon: ShieldCheck, label: "Graded Total", value: String(graded), accent: "text-holo-mint" },
              { icon: TrendingUp, label: "Cards Held", value: String(items.length), accent: "text-holo-cyan" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-3 transition-transform active:scale-95">
                <s.icon className={cn("h-4 w-4", s.accent)} />
                <p className="mt-1.5 font-display text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* interactive 3D showcase */}
      {featured && featuredCard ? (
        <section className="animate-fade-up glass overflow-hidden rounded-3xl p-4 sm:p-5" style={{ animationDelay: "80ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
              <Sparkles className="h-4 w-4 text-holo-magenta" /> INTERACTIVE SLAB SHOWCASE
            </p>
            <p className="hidden font-mono text-[9px] tracking-wider text-white/35 sm:block">DRAG TO ROTATE · SCROLL TO ZOOM · DBL-TAP TO RESET</p>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-[240px_1fr] sm:items-center">
            <HoloSlab key={featured.id} card={featuredCard} grade={featured.grade} serial={featured.serial} config={slabConfig} />
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-holo-cyan">{featured.serial}</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-white">{featuredCard.name}</h3>
                <p className="text-[11px] text-white/45">
                  {featuredCard.set} · {featuredCard.number} · {featuredCard.rarity}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-holo-gold/40 bg-holo-gold/10 px-2.5 py-1 font-mono text-[10px] font-bold text-holo-gold">
                  {featured.grade ?? "UNGRADED"}
                </span>
                <span className="rounded-full border border-holo-magenta/40 bg-holo-magenta/10 px-2.5 py-1 font-mono text-[10px] font-bold text-holo-magenta">
                  OFFICIAL VCA SLAB
                </span>
                <span className="font-mono text-[11px] text-white/60">{usd(slabValueOf(featuredCard, featured.grade))}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">
                Minted {featured.createdAt} · owned by {featured.ownerName}. This digital twin is cryptographically paired with its VCA certification record.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/card/${featuredCard.id}`)}
                  className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-[11px] font-bold text-void transition-transform active:scale-95"
                >
                  VIEW CERTIFICATION
                </button>
                <Link
                  to="/slab-creator"
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold text-white/80 transition-colors hover:bg-white/10"
                >
                  MINT ANOTHER
                </Link>
              </div>
            </div>
          </div>

          {/* slab selector */}
          {digitalSlabs.length > 1 && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setShowcaseIdx((i) => (i - 1 + digitalSlabs.length) % digitalSlabs.length)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
                aria-label="Previous slab"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
                {digitalSlabs.map((s, i) => {
                  const c = cardById(s.cardId);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setShowcaseIdx(i)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all active:scale-95",
                        i === safeIdx ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan" : "border-white/12 bg-white/4 text-white/55 hover:text-white",
                      )}
                    >
                      {c?.name ?? "Unknown"}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowcaseIdx((i) => (i + 1) % digitalSlabs.length)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
                aria-label="Next slab"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="animate-fade-up glass flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-magenta/25 to-holo-gold/20 ring-1 ring-holo-magenta/30">
            <Gem className="h-6 w-6 text-holo-magenta" />
          </span>
          <p className="font-display text-sm font-bold text-white">NO DIGITAL SLABS MINTED YET</p>
          <p className="max-w-xs text-[11px] leading-relaxed text-white/45">
            Scan a card and pass authentication to mint your first official VCA graded slab — it appears here as an interactive 3D twin.
          </p>
          <Link
            to="/scanner"
            className="mt-1 flex items-center gap-2 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-5 py-2.5 text-xs font-bold text-void transition-transform active:scale-95"
          >
            <ScanLine className="h-3.5 w-3.5" /> SCAN &amp; MINT
          </Link>
        </section>
      )}

      {/* grade distribution */}
      <section className="animate-fade-up glass rounded-3xl p-4 sm:p-5" style={{ animationDelay: "140ms" }}>
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <TrendingUp className="h-4 w-4 text-holo-mint" /> GRADE DISTRIBUTION
        </p>
        <div className="mt-3.5 space-y-2.5">
          {dist.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className={cn("w-28 shrink-0 truncate font-mono text-[10px] font-bold", r.text)}>{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", r.bar)}
                  style={{ width: barsIn ? `${Math.max(r.pct, r.count ? 6 : 0)}%` : "0%" }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-mono text-[11px] font-bold text-white/70">{r.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* holdings */}
      <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wide text-white/90">COLLECTION HOLDINGS</h2>
          <Link to="/collection" className="flex items-center text-[11px] font-bold text-holo-cyan hover:underline">
            Manage collection <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((i) => {
              const c = cardById(i.cardId);
              if (!c) return null;
              return (
                <div key={i.id} className="relative">
                  <CardArt card={c} grade={i.grade} serial={i.serial} showRarity onClick={() => navigate(`/card/${c.id}`)} />
                  {(i.slab === "digital" || i.slab === "physical") && (
                    <span
                      className={cn(
                        "absolute left-1.5 top-1.5 z-20 rounded-full px-2 py-1 font-mono text-[8px] font-bold backdrop-blur",
                        i.slab === "digital" ? "bg-holo-magenta/85 text-void" : "bg-holo-gold/85 text-void",
                      )}
                    >
                      {i.slab === "digital" ? "DIGITAL SLAB" : "NFC SLAB"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center text-xs text-white/40">
            No cards held yet — scan and add your first card to build the portfolio.
          </div>
        )}
      </section>
    </div>
  );
}
