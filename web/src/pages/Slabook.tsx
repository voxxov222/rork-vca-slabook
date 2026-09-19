import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Image, ScanLine, Send, Sparkles } from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import PostCard from "@/components/PostCard";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Slabook() {
  const { posts, currentUser, myItems, cardById, addPost } = useVca();
  const [draft, setDraft] = useState("");
  const [attachId, setAttachId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<"feed" | "saved">("feed");

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
          <p className="text-[11px] text-white/40">The social network for collectors</p>
        </div>
        <div className="glass flex rounded-full p-1">
          {(["feed", "saved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all",
                tab === t ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/45 hover:text-white",
              )}
            >
              {t === "saved" ? <Bookmark className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

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
            {attachId && (
              <div className="mt-2 flex w-24 items-center gap-2 rounded-xl border border-holo-cyan/25 bg-holo-cyan/5 p-1.5">
                {(() => {
                  const c = cardById(attachId);
                  return c ? <CardArt card={c} showMeta={false} interactive={false} /> : null;
                })()}
                <button onClick={() => setAttachId(null)} className="absolute -ml-2 -mt-8 h-4 w-4 rounded-full bg-void text-[9px] text-white/70 ring-1 ring-white/20">
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
        {(tab === "feed" ? posts : saved).map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {tab === "saved" && saved.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <Bookmark className="mx-auto h-6 w-6 text-white/25" />
            <p className="mt-2 text-xs text-white/40">No saved posts yet — tap the bookmark on any post to keep it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
