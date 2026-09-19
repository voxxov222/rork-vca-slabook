import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Gavel,
  Link2,
  Loader2,
  RefreshCcw,
  Store,
  TrendingUp,
  Unlink,
  Users,
  Video,
  Wallet,
} from "lucide-react";

import Avatar from "@/components/Avatar";
import { TRENDING, cardById } from "@/lib/data";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const PLATFORMS = [
  { id: "ebay", name: "eBay", icon: Gavel, accent: "text-holo-cyan", blurb: "Auctions & Buy-It-Now with global reach" },
  { id: "tcgplayer", name: "TCGplayer", icon: Store, accent: "text-holo-mint", blurb: "Market price-synced storefront" },
  { id: "whatnot", name: "Whatnot", icon: Video, accent: "text-holo-magenta", blurb: "Live breaks & auction streams" },
  { id: "facebook", name: "Facebook Marketplace", icon: Users, accent: "text-holo-gold", blurb: "Local sales & group trades" },
] as const;

export default function Marketplace() {
  const { currentUser, marketplace, connectMarketplace, disconnectMarketplace, syncMarketplace, pushNotification } = useVca();
  const [connecting, setConnecting] = useState<string | null>(null);

  const connect = (platformId: string) => {
    setConnecting(platformId);
    window.setTimeout(() => {
      connectMarketplace(platformId, `vca_${currentUser.displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
      setConnecting(null);
    }, 1300);
  };

  const connectedCount = PLATFORMS.filter((p) => marketplace[p.id]).length;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="holo-frame relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-cyan">
            <Store className="h-3.5 w-3.5" /> VCA MARKETPLACE HUB
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">Sell everywhere. Manage here.</h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/55">
            Connect your marketplace accounts to sync listings, track sales and price against live VCA market data — all
            from one dashboard. {connectedCount > 0 && <span className="font-bold text-holo-mint">{connectedCount} connected.</span>}
          </p>
        </div>
      </div>

      {/* platform accounts */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const acct = marketplace[p.id];
          const Icon = p.icon;
          const isConnecting = connecting === p.id;
          return (
            <div key={p.id} className={cn("glass rounded-2xl p-4 transition-all", acct && "border-holo-mint/25")}>
              <div className="flex items-start gap-3">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10", p.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-extrabold text-white">{p.name}</p>
                    {acct && (
                      <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-holo-mint">
                        <CheckCircle2 className="h-3 w-3" /> CONNECTED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/45">{p.blurb}</p>
                </div>
              </div>

              {acct ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat label="LISTINGS" value={String(acct.listings)} />
                    <Stat label="SOLD 30D" value={String(acct.sold30d)} />
                    <Stat label="REV 30D" value={usd(acct.revenue30d)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-mono text-[9px] text-white/35">
                      @{acct.handle} · synced {acct.lastSynced}
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          syncMarketplace(p.id);
                          pushNotification({ kind: "price", text: `${p.name} synced — listings and sales refreshed.` });
                        }}
                        className="flex items-center gap-1 rounded-full border border-holo-cyan/30 bg-holo-cyan/8 px-2.5 py-1 font-mono text-[9px] font-bold text-holo-cyan transition-transform active:scale-95"
                      >
                        <RefreshCcw className="h-3 w-3" /> SYNC
                      </button>
                      <button
                        onClick={() => disconnectMarketplace(p.id)}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/4 px-2.5 py-1 font-mono text-[9px] font-bold text-white/45 transition-transform hover:text-white active:scale-95"
                      >
                        <Unlink className="h-3 w-3" /> UNLINK
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => connect(p.id)}
                  disabled={isConnecting}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-holo-cyan/30 bg-holo-cyan/8 px-4 py-2.5 text-xs font-bold text-holo-cyan transition-all hover:bg-holo-cyan/15 active:scale-95 disabled:opacity-60"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> CONNECTING…
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> CONNECT ACCOUNT
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* demand watchlist */}
      <div>
        <h2 className="mb-2.5 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <TrendingUp className="h-4 w-4 text-holo-mint" /> HIGH-DEMAND CARDS · PRICED LIVE
        </h2>
        <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
          {TRENDING.map((t) => {
            const card = cardById(t.cardId);
            if (!card) return null;
            const up = !t.delta.startsWith("-");
            return (
              <Link key={t.cardId} to={`/card/${card.id}`} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/4">
                <img src={card.artUrl} alt={card.name} className="h-11 w-8 rounded-md object-cover ring-1 ring-white/15" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{card.name}</p>
                  <p className="truncate text-[10px] text-white/40">{card.set} · demand trending</p>
                </div>
                <span className="font-mono text-[11px] text-white/60">{usd(card.prices.g10)}</span>
                <span className={cn("flex w-14 items-center justify-end gap-0.5 font-mono text-[11px] font-bold", up ? "text-holo-mint" : "text-red-400")}>
                  {up ? <ArrowUpRight className="h-3 w-3" /> : null}
                  {t.delta}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* seller snapshot */}
      <div className="glass rounded-2xl p-4">
        <p className="mb-2.5 flex items-center gap-2 font-display text-[11px] font-bold tracking-wider text-white/70">
          <Wallet className="h-3.5 w-3.5 text-holo-gold" /> SELLER SNAPSHOT
        </p>
        <div className="flex items-center gap-3">
          <Avatar displayName={currentUser.displayName} hue={currentUser.avatarHue} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">{currentUser.displayName}</p>
            <p className="font-mono text-[10px] text-white/40">
              {connectedCount > 0
                ? `${PLATFORMS.filter((p) => marketplace[p.id]).map((p) => p.name).join(" · ")}`
                : "No marketplace accounts connected yet"}
            </p>
          </div>
          <p className="font-display text-lg font-extrabold text-holo-mint">
            {usd(PLATFORMS.reduce((sum, p) => sum + (marketplace[p.id]?.revenue30d ?? 0), 0))}
            <span className="ml-1 font-mono text-[9px] font-semibold text-white/35">30D</span>
          </p>
        </div>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-white/30">
        Connections in this demo are simulated locally. Production eBay/TCGplayer/Whatnot sync uses their partner APIs
        and OAuth — the account model here is wired for those integrations.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/25 px-2 py-1.5 text-center">
      <p className="font-mono text-[11px] font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[8px] font-bold tracking-wider text-white/35">{label}</p>
    </div>
  );
}
