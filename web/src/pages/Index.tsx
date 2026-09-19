import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, ChevronRight, Flame, Gem, Layers, ScanLine, Sparkles, Store, TrendingUp, Wallet } from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import PostCard from "@/components/PostCard";
import { ACTIVITY, TRENDING } from "@/lib/data";
import { useLiveCollectionValue } from "@/lib/prices";
import { useVca } from "@/lib/store";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  badge,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  accent: string;
  badge?: string;
}) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-3.5 transition-transform active:scale-95 sm:p-4">
      <Icon className={`h-4 w-4 ${accent}`} />
      <p className="mt-2 font-display text-lg font-extrabold text-white sm:text-xl">{value}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
        {badge && (
          <span className="rounded-full bg-holo-mint/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-normal text-holo-mint">{badge}</span>
        )}
      </p>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20 blur-2xl ${accent.replace("text-", "bg-")}`} />
    </div>
  );
}

export default function Index() {
  const { currentUser, myItems, collectionValue, posts, slabs, userById, cardById } = useVca();
  const navigate = useNavigate();
  const items = myItems();
  const value = collectionValue();
  const liveValue = useLiveCollectionValue(items);

  const g10 = items.filter((i) => i.grade === "VCA 10").length;
  const g9 = items.filter((i) => i.grade === "VCA 9").length;
  const g8 = items.filter((i) => i.grade === "VCA 8").length;
  const recent = items.slice(0, 6);
  const topSlabs = slabs.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="holo-frame relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-float rounded-full bg-holo-violet/20 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-cyan">
            <Sparkles className="h-3.5 w-3.5" /> VCA DIGITAL ECOSYSTEM
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Welcome back, <span className="holo-text">{currentUser.displayName}</span>.
          </h1>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-white/55">
            Your collection is synced. Scan new cards, mint digital slabs, and share your latest pulls with the Slabook network.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/scanner"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-xs font-bold text-void transition-transform hover:scale-105 active:scale-95"
            >
              <ScanLine className="h-3.5 w-3.5" /> SCAN A CARD
            </Link>
            <Link
              to="/slabook"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/85 transition-colors hover:bg-white/10"
            >
              <Flame className="h-3.5 w-3.5 text-holo-magenta" /> OPEN SLABOOK
            </Link>
            <Link
              to="/set-index"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/85 transition-colors hover:bg-white/10"
            >
              <BarChart3 className="h-3.5 w-3.5 text-holo-violet" /> SET INDEX
            </Link>
            <Link
              to="/marketplace"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/85 transition-colors hover:bg-white/10"
            >
              <Store className="h-3.5 w-3.5 text-holo-mint" /> MARKETPLACE
            </Link>
          </div>
        </div>
      </section>

      {/* collection stats */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wide text-white/90">YOUR COLLECTION</h2>
          <Link to="/collection" className="flex items-center text-[11px] font-bold text-holo-cyan hover:underline">
            Manage <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <StatTile icon={Wallet} label="Collection Value" value={usd(liveValue.total)} accent="text-holo-gold" badge={liveValue.isLive ? "LIVE" : "EST"} />
          <StatTile icon={Layers} label="Total Cards" value={String(currentUser.stats.cards)} accent="text-holo-cyan" />
          <StatTile icon={Gem} label="VCA 10" value={String(g10)} accent="text-holo-gold" />
          <StatTile icon={Gem} label="VCA 9" value={String(g9)} accent="text-holo-cyan" />
          <StatTile icon={Gem} label="VCA 8" value={String(g8)} accent="text-holo-violet" />
        </div>
      </section>

      {/* recent cards */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wide text-white/90">RECENT CARDS</h2>
          <Link to="/collection" className="flex items-center text-[11px] font-bold text-holo-cyan hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {recent.map((item) => {
            const card = cardById(item.cardId);
            if (!card) return null;
            return (
              <div key={item.id} className="w-36 shrink-0 snap-start sm:w-40">
                <CardArt card={card} grade={item.grade} serial={item.serial} showRarity onClick={() => navigate(`/card/${card.id}`)} />
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* trending */}
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <TrendingUp className="h-4 w-4 text-holo-mint" /> TRENDING CARDS
          </h2>
          <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
            {TRENDING.map((t) => {
              const card = cardById(t.cardId);
              if (!card) return null;
              const up = !t.delta.startsWith("-");
              return (
                <Link key={t.cardId} to={`/card/${card.id}`} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/4">
                  <span className="w-5 font-mono text-xs font-bold text-white/30">{t.rank}</span>
                  <img src={card.artUrl} alt={card.name} className="h-11 w-8 rounded-md object-cover ring-1 ring-white/15" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{card.name}</p>
                    <p className="truncate text-[10px] text-white/40">{card.set}</p>
                  </div>
                  <span className="font-mono text-[11px] text-white/60">{usd(card.prices.g10)}</span>
                  <span className={`w-14 text-right font-mono text-[11px] font-bold ${up ? "text-holo-mint" : "text-red-400"}`}>{t.delta}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* activity */}
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <Flame className="h-4 w-4 text-holo-magenta" /> LATEST VCA ACTIVITY
          </h2>
          <div className="glass space-y-3.5 rounded-2xl p-4">
            {ACTIVITY.map((a, i) => {
              const u = userById(a.userId);
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Avatar displayName={u.displayName} hue={u.avatarHue} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-white/70">
                      <Link to={`/collector/${u.id}`} className="font-bold text-white hover:underline">
                        {u.displayName}
                      </Link>{" "}
                      {a.text}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-white/35">{a.time} ago</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* newest slabs */}
          <h2 className="mb-2.5 mt-6 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <Gem className="h-4 w-4 text-holo-gold" /> NEWEST VCA SLABS
          </h2>
          <div className="space-y-2">
            {topSlabs.map((s) => {
              const card = cardById(s.cardId);
              if (!card) return null;
              return (
                <Link key={s.id} to={`/card/${card.id}`} className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors hover:bg-white/6">
                  <img src={card.artUrl} alt={card.name} className="h-11 w-8 rounded-md object-cover ring-1 ring-holo-cyan/30" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{card.name} · {s.grade ?? "AWAITING GRADE"}</p>
                    <p className="font-mono text-[10px] text-holo-cyan">{s.serial}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/30" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* feed preview */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wide text-white/90">FROM SLABOOK</h2>
          <Link to="/slabook" className="flex items-center text-[11px] font-bold text-holo-cyan hover:underline">
            Open feed <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-4">
          {posts.slice(0, 2).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
