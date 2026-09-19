import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Bookmark, Heart, MessageCircle, Send, Share2 } from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

const KIND_LABEL: Record<Post["kind"], string> = {
  post: "SLABOOK POST",
  scan: "SCANNER RESULT",
  grade: "NEW GRADE",
  slab: "NEW SLAB",
};

const KIND_STYLE: Record<Post["kind"], string> = {
  post: "border-white/15 bg-white/5 text-white/60",
  scan: "border-holo-cyan/40 bg-holo-cyan/10 text-holo-cyan",
  grade: "border-holo-gold/40 bg-holo-gold/10 text-holo-gold",
  slab: "border-holo-magenta/40 bg-holo-magenta/10 text-holo-magenta",
};

export default function PostCard({ post }: { post: Post }) {
  const { userById, cardById, toggleLike, toggleSave, addComment, sharePost, currentUser } = useVca();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");

  const author = userById(post.userId);
  const card = post.card ? cardById(post.card.cardId) : undefined;

  return (
    <article className="glass animate-fade-up rounded-2xl p-4 transition-colors hover:border-white/20">
      {/* header */}
      <div className="flex items-center gap-3">
        <Link to={`/collector/${author.id}`}>
          <Avatar displayName={author.displayName} hue={author.avatarHue} online={author.online} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link to={`/collector/${author.id}`} className="truncate text-sm font-bold text-white hover:underline">
              {author.displayName}
            </Link>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-holo-cyan text-void" />
          </div>
          <p className="text-[11px] text-white/40">
            @{author.username} · {post.time}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider", KIND_STYLE[post.kind])}>
          {KIND_LABEL[post.kind]}
        </span>
      </div>

      {/* text */}
      <p className="mt-3 text-[13.5px] leading-relaxed text-white/85">{post.text}</p>

      {/* card attachment */}
      {card && post.card && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-3.5">
          <div className="flex flex-col gap-3.5 sm:flex-row">
            <div className="w-32 shrink-0 self-center sm:self-start">
              <CardArt card={card} grade={post.card.grade} serial={post.card.serial} onClick={undefined} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-holo-cyan">🔥 {post.card.caption ?? "CARD"}</p>
                <p className="mt-1 font-display text-base font-bold text-white">
                  {card.name} <span className="text-sm font-medium text-white/45">— {card.set}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  {post.card.grade && <span className="font-mono font-bold text-holo-gold">{post.card.grade}</span>}
                  {post.card.serial && <span className="font-mono text-white/50">{post.card.serial}</span>}
                  <span className="text-white/40">
                    Est. value{" "}
                    <span className="font-mono font-bold text-holo-cyan">
                      ${(post.card.grade === "VCA 10" ? card.prices.g10 : post.card.grade === "VCA 9" ? card.prices.g9 : post.card.grade === "VCA 8" ? card.prices.g8 : card.prices.raw).toLocaleString("en-US")}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-white/30">Estimated Market Value · {card.priceDate}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/card/${card.id}`}
                  className="holo-frame rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-transform hover:scale-105"
                >
                  View Card
                </Link>
                <Link
                  to="/collection"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 transition-colors hover:bg-white/10"
                >
                  View Collection
                </Link>
                <Link
                  to={`/slab-creator?card=${card.id}`}
                  className="rounded-full border border-holo-magenta/30 bg-holo-magenta/10 px-3 py-1.5 text-[11px] font-bold text-holo-magenta transition-colors hover:bg-holo-magenta/20"
                >
                  Create Slab
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* actions */}
      <div className="mt-3 flex items-center gap-1 border-t border-white/5 pt-2.5">
        <button
          onClick={() => toggleLike(post.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-90",
            post.likedByMe ? "text-holo-magenta" : "text-white/50 hover:bg-white/5 hover:text-white",
          )}
        >
          <Heart className={cn("h-4 w-4", post.likedByMe && "fill-holo-magenta drop-shadow-[0_0_6px_rgba(255,79,216,0.7)]")} />
          {post.likes}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments.length}
        </button>
        <button
          onClick={() => sharePost(post.id)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Share2 className="h-4 w-4" />
          {post.shares}
        </button>
        <button
          onClick={() => toggleSave(post.id)}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-90",
            post.saved ? "text-holo-gold" : "text-white/50 hover:bg-white/5 hover:text-white",
          )}
        >
          <Bookmark className={cn("h-4 w-4", post.saved && "fill-holo-gold")} />
        </button>
      </div>

      {/* comments */}
      {showComments && (
        <div className="mt-2 space-y-2.5 border-t border-white/5 pt-3">
          {post.comments.map((c) => {
            const cu = userById(c.userId);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar displayName={cu.displayName} hue={cu.avatarHue} size="sm" />
                <div className="min-w-0 rounded-xl rounded-tl-sm bg-white/5 px-3 py-2">
                  <p className="text-[11px] font-bold text-white/80">
                    {cu.displayName} <span className="font-normal text-white/35">· {c.time}</span>
                  </p>
                  <p className="text-xs text-white/70">{c.text}</p>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <Avatar displayName={currentUser.displayName} hue={currentUser.avatarHue} size="sm" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  addComment(post.id, draft.trim());
                  setDraft("");
                }
              }}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
            />
            <button
              onClick={() => {
                if (draft.trim()) {
                  addComment(post.id, draft.trim());
                  setDraft("");
                }
              }}
              className="rounded-full bg-holo-cyan/15 p-2 text-holo-cyan transition-colors hover:bg-holo-cyan/25"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
