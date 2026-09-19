import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Compass, Gem, MessageCircle, Search, ThumbsUp, TrendingUp, UserPlus } from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import { CATALOG, TRENDING } from "@/lib/data";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function Discover() {
  const navigate = useNavigate();
  const { users, slabs, follows, toggleFollow, connections, toggleConnection, cardById, userById } = useVca();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"trending" | "collectors" | "slabs">("trending");

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      cards: CATALOG.filter(
        (c) => c.name.toLowerCase().includes(q) || c.set.toLowerCase().includes(q) || c.rarity.toLowerCase().includes(q),
      ),
      people: users.filter(
        (u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.favoritePokemon.toLowerCase().includes(q),
      ),
      slabs: slabs.filter(
        (s) => s.serial.toLowerCase().includes(q) || (cardById(s.cardId)?.name.toLowerCase().includes(q) ?? false),
      ),
    };
  }, [q, CATALOG, users, slabs, cardById]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">
          <span className="holo-text">Discover</span> the network
        </h1>
        <p className="text-[11px] text-white/40">Trending cards, new slabs, and collectors to follow</p>
      </div>

      {/* search */}
      <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3 focus-within:border-holo-cyan/50">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards, sets, collectors, serial numbers…"
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[10px] font-bold text-white/40 hover:text-white">
            CLEAR
          </button>
        )}
      </div>

      {/* search results */}
      {results ? (
        <div className="space-y-5">
          {results.cards.length === 0 && results.people.length === 0 && results.slabs.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-xs text-white/40">
              <Compass className="mx-auto mb-2 h-6 w-6 text-white/20" />
              No results for “{query}”
            </div>
          )}

          {results.cards.length > 0 && (
            <div>
              <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">CARDS</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {results.cards.map((c) => (
                  <CardArt key={c.id} card={c} onClick={() => navigate(`/card/${c.id}`)} />
                ))}
              </div>
            </div>
          )}

          {results.people.length > 0 && (
            <div>
              <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">COLLECTORS</h2>
              <div className="space-y-2">
                {results.people.map((u) => (
                  <div key={u.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <Avatar displayName={u.displayName} hue={u.avatarHue} online={u.online} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/collector/${u.id}`} className="truncate text-sm font-bold text-white hover:underline">
                        {u.displayName} <span className="text-[11px] font-normal text-white/40">@{u.username}</span>
                      </Link>
                      <p className="truncate text-[11px] text-white/45">
                        {u.stats.cards} cards · LVL {u.level}
                      </p>
                    </div>
                    <Link to={`/collector/${u.id}`} className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70 hover:bg-white/8">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.slabs.length > 0 && (
            <div>
              <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">VCA SLABS</h2>
              <div className="space-y-2">
                {results.slabs.map((s) => {
                  const c = cardById(s.cardId);
                  if (!c) return null;
                  return (
                    <Link key={s.id} to={`/card/${c.id}`} className="glass flex items-center gap-3 rounded-2xl p-3 hover:bg-white/6">
                      <img src={c.artUrl} alt={c.name} className="h-12 w-9 rounded-md object-cover ring-1 ring-holo-cyan/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{c.name} · {s.grade ?? "AWAITING GRADE"}</p>
                        <p className="font-mono text-[10px] text-holo-cyan">{s.serial}</p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold", s.kind === "physical" ? "border-holo-gold/40 text-holo-gold" : "border-holo-magenta/40 text-holo-magenta")}>
                        {s.kind === "physical" ? "NFC" : "DIGITAL"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* tabs */}
          <div className="glass flex w-fit rounded-full p-1">
            {(
              [
                ["trending", TrendingUp],
                ["collectors", UserPlus],
                ["slabs", Gem],
              ] as const
            ).map(([t, Icon]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold capitalize transition-all",
                  tab === t ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/45 hover:text-white",
                )}
              >
                <Icon className="h-3 w-3" /> {t}
              </button>
            ))}
          </div>

          {tab === "trending" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TRENDING.map((t) => {
                const card = cardById(t.cardId);
                if (!card) return null;
                const up = !t.delta.startsWith("-");
                return (
                  <div key={t.cardId} className="group relative">
                    <CardArt card={card} onClick={() => navigate(`/card/${card.id}`)} />
                    <div className="mt-2 flex items-center justify-between px-0.5">
                      <span className={cn("font-mono text-[10px] font-bold", up ? "text-holo-mint" : "text-red-400")}>
                        {t.delta} this week
                      </span>
                      <span className="font-mono text-[10px] text-white/50">{usd(card.prices.g10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "collectors" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {users
                .filter((u) => !u.isSelf)
                .map((u) => (
                  <div key={u.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <Avatar displayName={u.displayName} hue={u.avatarHue} size="lg" online={u.online} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Link to={`/collector/${u.id}`} className="truncate text-sm font-bold text-white hover:underline">
                            {u.displayName}
                          </Link>
                          <BadgeCheck className="h-3.5 w-3.5 fill-holo-cyan text-void" />
                        </div>
                        <p className="truncate text-[11px] text-white/40">
                          @{u.username} · {u.location}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-holo-cyan">
                          {u.stats.cards} CARDS · {u.stats.graded} GRADED
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-white/55">{u.bio}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggleFollow(u.id)}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-bold transition-all active:scale-95",
                          follows[u.id] ? "border border-white/15 bg-white/5 text-white/60" : "bg-gradient-to-r from-holo-cyan to-holo-violet text-void",
                        )}
                      >
                        <ThumbsUp className="h-3 w-3" /> {follows[u.id] ? "FOLLOWING" : "FOLLOW"}
                      </button>
                      <button
                        onClick={() => toggleConnection(u.id)}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-bold transition-all active:scale-95",
                          connections[u.id] ? "border border-holo-mint/40 bg-holo-mint/10 text-holo-mint" : "border border-white/15 bg-white/5 text-white/70",
                        )}
                      >
                        <UserPlus className="h-3 w-3" /> {connections[u.id] ? "CONNECTED" : "ADD CONNECTION"}
                      </button>
                      <Link
                        to="/messenger"
                        className="flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 text-white/70 transition-colors hover:bg-white/10"
                        aria-label={`Message ${u.displayName}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === "slabs" && (
            <div className="space-y-2">
              {slabs.map((s) => {
                const c = cardById(s.cardId);
                const owner = userById(s.ownerName.toLowerCase() === "todd" ? "u-todd" : "u-guru");
                if (!c) return null;
                return (
                  <Link key={s.id} to={`/card/${c.id}`} className="glass flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-white/6">
                    <img src={c.artUrl} alt={c.name} className="h-14 w-10 rounded-md object-cover ring-1 ring-holo-cyan/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{c.name}</p>
                      <p className="font-mono text-[10px] text-holo-cyan">{s.serial}</p>
                      <p className="text-[10px] text-white/40">
                        {s.grade ?? "AWAITING GRADE"} · slabbed by {owner.displayName} · {s.createdAt}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold", s.kind === "physical" ? "border-holo-gold/40 text-holo-gold" : "border-holo-magenta/40 text-holo-magenta")}>
                      {s.kind === "physical" ? "NFC PHYSICAL" : "DIGITAL"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
