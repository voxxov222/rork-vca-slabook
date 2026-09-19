import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, MessageCircle, Send, Smile, Wifi } from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

const REACTIONS = ["🔥", "💎", "😍", "😂", "👀"];

export default function Messenger() {
  const [params] = useSearchParams();
  const { conversations, users, sendMessage, reactToMessage, markConversationRead, userById, myItems, cardById } = useVca();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingReply, setPendingReply] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const items = myItems();

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const partner = active ? userById(active.userId) : null;

  /* open conversation from ?user= param (Message buttons on profiles) */
  useEffect(() => {
    const target = params.get("user");
    if (!target) return;
    const conv = conversations.find((c) => c.userId === target);
    if (conv) {
      setActiveId(conv.id);
      markConversationRead(conv.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, pendingReply]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const lastMessage = useMemo(
    () => (c: (typeof conversations)[number]) => c.messages[c.messages.length - 1],
    [],
  );

  const send = () => {
    if (!active || !draft.trim()) return;
    sendMessage(active.id, draft.trim());
    setDraft("");
    setPendingReply(active.id);
    window.setTimeout(() => setPendingReply(null), 2400);
  };

  const sendCard = (cardId: string) => {
    if (!active) return;
    const card = cardById(cardId);
    sendMessage(active.id, `Check out this card — ${card?.name} (${card?.set})`, cardId);
    setAttachOpen(false);
    setPendingReply(active.id);
    window.setTimeout(() => setPendingReply(null), 2400);
  };

  /* ------------------ conversation list ------------------ */
  if (!active || !partner) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">
            VCA <span className="holo-text">Messenger</span>
          </h1>
          <p className="text-[11px] text-white/40">
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="space-y-2">
          {conversations.map((c) => {
            const u = userById(c.userId);
            const last = lastMessage(c);
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveId(c.id);
                  markConversationRead(c.id);
                }}
                className="glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:bg-white/6"
              >
                <Avatar displayName={u.displayName} hue={u.avatarHue} size="lg" online={u.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white">{u.displayName}</p>
                    <span className="shrink-0 font-mono text-[9px] text-white/35">{last?.time}</span>
                  </div>
                  <p className={cn("truncate text-[12px]", c.unread > 0 ? "font-semibold text-white/85" : "text-white/45")}>
                    {last?.fromMe ? "You: " : ""}
                    {last?.text}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-holo-magenta px-1.5 font-mono text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ------------------ chat view ------------------ */
  return (
    <div className="flex h-[calc(100dvh-170px)] flex-col lg:h-[calc(100dvh-120px)]">
      {/* chat header */}
      <div className="glass flex items-center gap-3 rounded-t-3xl px-4 py-3">
        <button onClick={() => setActiveId(null)} className="rounded-full p-1.5 text-white/60 hover:bg-white/8 lg:hidden" aria-label="Back">
          <ArrowLeft className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </button>
        <Avatar displayName={partner.displayName} hue={partner.avatarHue} online={partner.online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{partner.displayName}</p>
          <p className="flex items-center gap-1 text-[10px] text-holo-mint">
            <Wifi className="h-2.5 w-2.5" /> {partner.online ? "online" : "offline"}
          </p>
        </div>
        <p className="hidden font-mono text-[9px] tracking-wider text-white/30 sm:block">@{partner.username}</p>
      </div>

      {/* messages */}
      <div className="glass-strong flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {active.messages.map((m) => {
          const card = m.cardId ? cardById(m.cardId) : undefined;
          return (
            <div key={m.id} className={cn("group flex", m.fromMe ? "justify-end" : "justify-start")}>
              <div className="max-w-[80%]">
                {card && (
                  <div className={cn("mb-1.5 w-28", m.fromMe && "ml-auto")}>
                    <CardArt card={card} showMeta={false} interactive={false} />
                  </div>
                )}
                <div
                  onDoubleClick={() => reactToMessage(active.id, m.id, "🔥")}
                  className={cn(
                    "cursor-pointer rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.fromMe
                      ? "rounded-br-sm bg-gradient-to-br from-holo-cyan/90 to-holo-violet/85 font-medium text-void"
                      : "rounded-bl-sm border border-white/10 bg-white/8 text-white/85",
                  )}
                >
                  {m.text}
                </div>
                <div className={cn("mt-0.5 flex items-center gap-1.5 px-1", m.fromMe && "justify-end")}>
                  <span className="font-mono text-[8px] text-white/30">{m.time}</span>
                  {m.reaction ? (
                    <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{m.reaction}</span>
                  ) : (
                    <span className="invisible flex gap-0.5 group-hover:visible">
                      {REACTIONS.map((r) => (
                        <button key={r} onClick={() => reactToMessage(active.id, m.id, r)} className="text-[11px] transition-transform hover:scale-125">
                          {r}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* typing indicator */}
        {pendingReply === active.id && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-white/8 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* attach picker */}
      {attachOpen && (
        <div className="border-t border-white/8 bg-void/90 px-4 py-3">
          <p className="mb-2 font-mono text-[9px] font-bold tracking-[0.25em] text-holo-cyan">SHARE A CARD</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {items.map((i) => {
              const c = cardById(i.cardId);
              if (!c) return null;
              return (
                <button key={i.id} onClick={() => sendCard(c.id)} className="w-20 shrink-0 transition-transform hover:-translate-y-1">
                  <CardArt card={c} showMeta={false} interactive={false} />
                  <p className="mt-1 truncate text-[9px] font-bold text-white/70">{c.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* composer */}
      <div className="glass flex items-center gap-2 rounded-b-3xl px-3 py-3">
        <button
          onClick={() => setAttachOpen((o) => !o)}
          className={cn("rounded-full p-2 transition-colors", attachOpen ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/45 hover:bg-white/8 hover:text-white")}
          aria-label="Share a card"
        >
          <ImagePlus className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
        />
        <button className="rounded-full p-2 text-white/45 hover:bg-white/8 hover:text-white" aria-label="Emoji">
          <Smile className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet p-2.5 text-void transition-all hover:brightness-110 active:scale-90 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {conversations.length === 0 && (
        <div className="glass mt-4 rounded-3xl p-8 text-center">
          <MessageCircle className="mx-auto h-6 w-6 text-white/25" />
          <p className="mt-2 text-xs text-white/40">No conversations yet — message a collector from their profile.</p>
        </div>
      )}
    </div>
  );
}
