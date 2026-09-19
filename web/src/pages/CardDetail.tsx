import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Gem, Layers, MessageSquareShare, ScanLine, ShieldCheck, Sparkles } from "lucide-react";

import CardArt from "@/components/CardArt";
import GradeRoiPanel from "@/components/GradeRoiPanel";
import PostCard from "@/components/PostCard";
import PriceHistory from "@/components/PriceHistory";
import PriceLadder from "@/components/PriceLadder";
import { CATALOG } from "@/lib/data";
import { useLivePrices } from "@/lib/prices";
import { useVca } from "@/lib/store";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function CardDetail() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const {
    cardById,
    collection,
    currentUser,
    addToCollection,
    createDigitalSlab,
    sendToGrading,
    addPost,
    posts,
    pushNotification,
  } = useVca();
  const card = cardId ? cardById(cardId) : undefined;
  const { data: livePrices, isLoading: liveLoading } = useLivePrices(card);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");

  const owned = useMemo(() => collection.filter((i) => i.cardId === cardId && i.ownerId === currentUser.id), [collection, cardId, currentUser.id]);
  const featuring = useMemo(() => posts.filter((p) => p.card?.cardId === cardId), [posts, cardId]);
  const similar = useMemo(() => (card ? CATALOG.filter((c) => c.id !== card.id).slice(0, 4) : []), [card]);

  if (!card) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <ScanLine className="mx-auto h-8 w-8 text-white/25" />
        <p className="mt-3 text-sm font-bold text-white/70">Card not found</p>
        <button onClick={() => navigate("/collection")} className="mt-3 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-xs font-bold text-void">
          Back to collection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[11px] font-bold text-white/45 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> BACK
      </button>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* card visual */}
        <div className="mx-auto w-64 lg:mx-0 lg:w-full">
          <CardArt card={card} grade={owned.find((i) => i.grade)?.grade ?? null} serial={owned.find((i) => i.serial)?.serial ?? null} interactive={false} />
        </div>

        {/* info */}
        <div className="space-y-4">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-mint">
              <ShieldCheck className="h-3.5 w-3.5" /> AUTHENTICITY CHECK PASSED · VCA VERIFIED
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">{card.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
              <span>{card.set}</span>
              <span>·</span>
              <span className="font-mono">{card.number}</span>
              <span>·</span>
              <span>{card.rarity}</span>
              <span>·</span>
              <span>{card.year}</span>
              <span>·</span>
              <span>{card.language}</span>
              <span>·</span>
              <span>{card.variant}</span>
            </p>
          </div>

          {/* status chips */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-holo-cyan/30 bg-holo-cyan/8 px-3 py-1.5 text-[11px] font-bold text-holo-cyan">
              <BadgeCheck className="h-3 w-3" /> {owned.length > 0 ? `IN YOUR COLLECTION ×${owned.length}` : "NOT IN COLLECTION"}
            </span>
            {owned.some((i) => i.slab === "digital" || i.slab === "physical") && (
              <span className="flex items-center gap-1.5 rounded-full border border-holo-magenta/30 bg-holo-magenta/8 px-3 py-1.5 text-[11px] font-bold text-holo-magenta">
                <Sparkles className="h-3 w-3" /> SLABBED · {owned.find((i) => i.serial)?.serial}
              </span>
            )}
            {owned.some((i) => i.slab === "grading") && (
              <span className="flex items-center gap-1.5 rounded-full border border-holo-gold/30 bg-holo-gold/8 px-3 py-1.5 text-[11px] font-bold text-holo-gold">
                <Gem className="h-3 w-3" /> AT VCA FOR GRADING
              </span>
            )}
          </div>

          {/* actions */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <button
              onClick={() => addToCollection(card.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-holo-cyan/30 bg-holo-cyan/8 p-3 text-[10px] font-bold text-white transition-all hover:bg-holo-cyan/15 active:scale-95"
            >
              <Layers className="h-5 w-5 text-holo-cyan" /> ADD TO COLLECTION
            </button>
            <button
              onClick={() => {
                createDigitalSlab(card.id, "VCA 10");
                navigate(`/slab-creator?card=${card.id}`);
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-holo-magenta/30 bg-holo-magenta/8 p-3 text-[10px] font-bold text-white transition-all hover:bg-holo-magenta/15 active:scale-95"
            >
              <Sparkles className="h-5 w-5 text-holo-magenta" /> CREATE 3D SLAB
            </button>
            <button
              onClick={() => {
                sendToGrading(card.id);
                pushNotification({ kind: "grade", text: `${card.name} submitted for VCA professional grading — physical NFC slab to follow.` });
                navigate("/collection");
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-holo-gold/30 bg-holo-gold/8 p-3 text-[10px] font-bold text-white transition-all hover:bg-holo-gold/15 active:scale-95"
            >
              <Gem className="h-5 w-5 text-holo-gold" /> SEND TO VCA
            </button>
            <button
              onClick={() => {
                setShareOpen((o) => !o);
                setShareText(`Just pulled up ${card.name} (${card.set}) on VCA — estimated ${usd(card.prices.raw)} raw, ${usd(card.prices.g10)} at VCA 10 🔥`);
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 p-3 text-[10px] font-bold text-white/80 transition-all hover:bg-white/10 active:scale-95"
            >
              <MessageSquareShare className="h-5 w-5 text-holo-violet" /> SHARE ON SLABOOK
            </button>
          </div>

          {shareOpen && (
            <div className="glass animate-fade-up rounded-2xl p-4">
              <p className="mb-2 font-display text-xs font-bold tracking-wider text-white/90">SHARE ON SLABOOK</p>
              <textarea
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-holo-cyan/50"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setShareOpen(false)} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white/50 hover:text-white">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addPost(shareText, { cardId: card.id, grade: owned.find((i) => i.grade)?.grade ?? null, serial: owned.find((i) => i.serial)?.serial ?? null, caption: "CARD SPOTLIGHT" });
                    setShareOpen(false);
                    navigate("/slabook");
                  }}
                  className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-1.5 text-[11px] font-bold text-void"
                >
                  Post to Slabook
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* price engine */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PriceLadder card={card} live={livePrices ?? null} loading={liveLoading} />
        <PriceHistory card={card} live={livePrices ?? null} />
      </div>

      {/* should I slab? — grading ROI engine */}
      <GradeRoiPanel card={card} live={livePrices ?? null} />

      {/* social */}
      <section>
        <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">SLABOOK POSTS FEATURING THIS CARD</h2>
        <div className="space-y-4">
          {featuring.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {featuring.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-xs text-white/40">No posts yet — be the first to share this card.</p>
              <Link to="/slabook" className="mt-2 inline-block text-[11px] font-bold text-holo-cyan hover:underline">
                Open Slabook →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* similar */}
      <section>
        <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">MORE FROM THE SET ERA</h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {similar.map((c) => (
            <div key={c.id} className="w-36 shrink-0">
              <CardArt card={c} onClick={() => navigate(`/card/${c.id}`)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
