import { useRef, useState } from "react";
import { toast } from 'sonner';
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BadgeCheck,
  ExternalLink,
  Gem,
  GripVertical,
  Heart,
  Image as ImageIcon,
  Layers,
  Link2,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";

import Avatar from "@/components/Avatar";
import CardArt from "@/components/CardArt";
import PostCard from "@/components/PostCard";
import { cardById } from "@/lib/data";
import { downscaleForUpload, fileToDataUrl } from "@/lib/vision";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { GradeLabel, ProfileBlockKind, User } from "@/lib/types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Tab = "cards" | "posts" | "slabs" | "wishlist";

const BLOCK_LABELS: Record<ProfileBlockKind, string> = {
  stats: "Collection Stats",
  featured: "Featured Slabs",
  media: "Media Gallery",
  links: "Links",
  activity: "Activity Feed",
  bio: "About & Badges",
};

export default function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const isCollectorRoute = Boolean(params.userId);

  return isCollectorRoute ? <CollectorProfile userId={params.userId!} /> : <SelfProfile />;
}

/* ------------------------------ SELF ------------------------------ */
function SelfProfile() {
  const {
    currentUser,
    myItems,
    posts,
    slabs,
    notifications,
    profileBlocks,
    profileMedia,
    addBlock,
    moveBlock,
    removeBlock,
    addProfileMedia,
    removeProfileMedia,
    updateProfile,
    saving,
  } = useVca();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("cards");
  const [editing, setEditing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [profile, setProfile] = useState<User>(currentUser);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [linkDraft, setLinkDraft] = useState<{ title: string; url: string } | null>(null);
  const dragId = useRef<string | null>(null);

  const items = myItems().filter((i) => !i.wishlist);
  const wishlist = myItems().filter((i) => i.wishlist);
  const myPosts = posts.filter((p) => p.userId === currentUser.id);
  const mySlabs = slabs.filter((s) => s.ownerName === currentUser.displayName);

  /* upload a gallery image (auto-resized before persisting to Postgres) */
  const uploadMedia = async (file: File) => {
    try {
      setMediaBusy(true);
      const dataUrl = await downscaleForUpload(await fileToDataUrl(file));
      addProfileMedia({ mediaType: "image", title: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Upload", url: dataUrl });
    } catch {
      addProfileMedia({ mediaType: "image", title: "Upload", url: await fileToDataUrl(file) });
    } finally {
      setMediaBusy(false);
    }
  };

  const submitLink = () => {
    if (!linkDraft?.url.trim()) return;
    const url = linkDraft.url.trim().startsWith("http") ? linkDraft.url.trim() : `https://${linkDraft.url.trim()}`;
    addProfileMedia({ mediaType: "link", title: linkDraft.title.trim() || url, url });
    setLinkDraft(null);
  };

  const onDropOn = (targetId: string) => {
    const src = dragId.current;
    dragId.current = null;
    if (!src || src === targetId) return;
    const list = [...profileBlocks];
    const from = list.findIndex((b) => b.id === src);
    const to = list.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    /* apply reorder via repeated move so persistence stays in one place */
    const id = moved.id;
    const step = to > from ? 1 : -1;
    let cur = from;
    while (cur !== to) {
      moveBlock(id, step as -1 | 1);
      cur += step;
    }
    void list;
  };

  return (
    <div className="space-y-5">
      {/* banner */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="h-36 animate-holo-shift bg-[linear-gradient(110deg,#0a2a3a,#1a1440,#3a1040,#3a2a08,#0a2a3a)] bg-[length:300%_300%] sm:h-44">
          <div className="absolute inset-0 grid-bg opacity-70" />
          <div className="starfield absolute inset-0 opacity-70" />
        </div>
        <div className="glass-strong relative -mt-12 rounded-b-3xl px-5 pb-5 pt-0">
          <div className="flex items-end justify-between">
            <div className="-mt-8 flex items-end gap-4">
              <Avatar displayName={profile.displayName} hue={profile.avatarHue} size="xl" online className="rounded-full ring-4 ring-void" />
              <div className="pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-display text-xl font-extrabold text-white">{profile.displayName}</h1>
                  <BadgeCheck className="h-5 w-5 fill-holo-cyan text-void" />
                </div>
                <p className="text-xs text-white/45">@{profile.username}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing((e) => !e)}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-white/15"
            >
              <Pencil className="h-3 w-3" /> EDIT
            </button>
          </div>

          {editing ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  ["displayName", "Display name"],
                  ["location", "Location"],
                  ["favoritePokemon", "Favorite Pokémon"],
                  ["favoriteSet", "Favorite set"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {label}
                  <input
                    value={profile[key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white outline-none focus:border-holo-cyan/50"
                  />
                </label>
              ))}
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 sm:col-span-2">
                Bio
                <textarea
                  value={profile.bio}
                  rows={2}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white outline-none focus:border-holo-cyan/50"
                />
              </label>
              <button
                disabled={saving}
                onClick={() => void updateProfile(profile).then(() => setEditing(false)).catch(e => toast.error(e.message))}
                className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-[11px] font-bold text-void sm:w-fit"
              >
                Save profile
              </button>
            </div>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
                <MapPin className="h-3 w-3" /> {profile.location}
                <span className="ml-2 font-mono text-holo-cyan">LVL {profile.level} COLLECTOR</span>
              </p>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/70">{profile.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.badges.map((b) => (
                  <span key={b} className="flex items-center gap-1 rounded-full border border-holo-gold/30 bg-holo-gold/10 px-2.5 py-1 text-[10px] font-bold text-holo-gold">
                    <Award className="h-2.5 w-2.5" /> {b}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* builder toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setBuilding((b) => !b)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-95",
            building
              ? "bg-gradient-to-r from-holo-cyan to-holo-violet text-void"
              : "border border-white/15 bg-white/5 text-white/75 hover:text-white",
          )}
        >
          <Layers className="h-3.5 w-3.5" /> {building ? "DONE ARRANGING" : "CUSTOMIZE PROFILE"}
        </button>
        {building && (
          <div className="flex flex-wrap gap-1.5">
            {(["stats", "featured", "media", "links", "activity", "bio"] as ProfileBlockKind[]).map((k) => (
              <button
                key={k}
                onClick={() => addBlock(k)}
                className="flex items-center gap-1 rounded-full border border-holo-cyan/30 bg-holo-cyan/8 px-2.5 py-1.5 text-[10px] font-bold text-holo-cyan transition-transform active:scale-95"
              >
                <Plus className="h-3 w-3" /> {BLOCK_LABELS[k]}
              </button>
            ))}
          </div>
        )}
        {building && <p className="ml-auto hidden font-mono text-[9px] text-white/30 sm:block">DRAG OR USE ARROWS · CHANGES SAVE AUTOMATICALLY</p>}
      </div>

      {/* building blocks */}
      <div className="space-y-4">
        {profileBlocks.map((block, idx) => (
          <div
            key={block.id}
            draggable={building}
            onDragStart={() => {
              dragId.current = block.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOn(block.id)}
            className={cn("relative", building && "cursor-grab active:cursor-grabbing")}
          >
            {building && (
              <div className="absolute -top-2 right-2 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-void/90 px-1.5 py-1 backdrop-blur">
                <GripVertical className="h-3.5 w-3.5 text-white/30" />
                <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label="Move block up">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button onClick={() => moveBlock(block.id, 1)} disabled={idx === profileBlocks.length - 1} className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label="Move block down">
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button onClick={() => removeBlock(block.id)} className="rounded-full p-1 text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-300" aria-label="Remove block">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className={cn(building && "rounded-3xl ring-2 ring-holo-cyan/30")}>
              {renderBlock(block.kind)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* -------- block renderers -------- */
  function renderBlock(kind: ProfileBlockKind) {
    switch (kind) {
      case "stats":
        return (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icon: Layers, label: "Cards", value: String(items.length), accent: "text-holo-cyan" },
              { icon: Gem, label: "Graded", value: String(items.filter((i) => i.grade).length), accent: "text-holo-gold" },
              { icon: Wallet, label: "Slab Value", value: usd(mySlabs.reduce((s, sl) => s + (cardById(sl.cardId)?.prices.g10 ?? 0), 0)), accent: "text-holo-mint" },
              { icon: Heart, label: "Favorites", value: String(items.filter((i) => i.favorite).length), accent: "text-holo-magenta" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-3.5">
                <s.icon className={cn("h-4 w-4", s.accent)} />
                <p className="mt-1.5 font-display text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
        );

      case "featured":
        return (
          <div className="glass rounded-3xl p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white/90">
              <Sparkles className="h-4 w-4 text-holo-magenta" /> FEATURED SLABS
            </p>
            {mySlabs.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mySlabs.slice(0, 3).map((s) => {
                  const c = cardById(s.cardId);
                  if (!c) return null;
                  return <CardArt key={s.id} card={c} grade={s.grade} serial={s.serial} onClick={() => navigate(`/card/${c.id}`)} />;
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-white/35">No slabs yet — mint one from a scan.</p>
            )}
          </div>
        );

      case "media": {
        const images = profileMedia.filter((m) => m.mediaType === "image");
        return (
          <div className="glass rounded-3xl p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white/90">
              <ImageIcon className="h-4 w-4 text-holo-cyan" /> MEDIA GALLERY
            </p>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((m) => (
                  <div key={m.id} className="group relative overflow-hidden rounded-xl ring-1 ring-white/10">
                    <img src={m.url} alt={m.title} className="aspect-square w-full object-cover" />
                    {building && (
                      <button
                        onClick={() => removeProfileMedia(m.id)}
                        className="absolute right-1 top-1 rounded-full bg-void/85 p-1 text-red-300 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove media"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-holo-cyan/30 bg-holo-cyan/5 px-4 py-3 text-[11px] font-bold text-holo-cyan transition-colors hover:bg-holo-cyan/12">
              <ImageIcon className="h-4 w-4" /> {mediaBusy ? "PROCESSING…" : "UPLOAD PHOTO"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = "";
                  await uploadMedia(file);
                }}
              />
            </label>
          </div>
        );
      }

      case "links": {
        const links = profileMedia.filter((m) => m.mediaType === "link");
        return (
          <div className="glass rounded-3xl p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white/90">
              <Link2 className="h-4 w-4 text-holo-violet" /> LINKS
            </p>
            <div className="space-y-2">
              {links.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-holo-violet" />
                  <a href={m.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-semibold text-white/80 hover:text-holo-cyan">
                    {m.title}
                  </a>
                  {building && (
                    <button onClick={() => removeProfileMedia(m.id)} className="rounded-full p-1 text-red-300/80 hover:bg-red-500/15" aria-label="Remove link">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {linkDraft ? (
              <div className="mt-3 space-y-2">
                <input
                  value={linkDraft.title}
                  onChange={(e) => setLinkDraft((d) => ({ ...d!, title: e.target.value }))}
                  placeholder="Link title (e.g. My eBay store)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-holo-cyan/50"
                />
                <input
                  value={linkDraft.url}
                  onChange={(e) => setLinkDraft((d) => ({ ...d!, url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-holo-cyan/50"
                />
                <div className="flex gap-2">
                  <button onClick={submitLink} className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-1.5 text-[11px] font-bold text-void">
                    Add link
                  </button>
                  <button onClick={() => setLinkDraft(null)} className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold text-white/60">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLinkDraft({ title: "", url: "" })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-holo-violet/30 bg-holo-violet/5 px-4 py-3 text-[11px] font-bold text-holo-violet transition-colors hover:bg-holo-violet/12"
              >
                <Plus className="h-4 w-4" /> ADD LINK
              </button>
            )}
          </div>
        );
      }

      case "activity":
        return (
          <div className="glass rounded-3xl p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white/90">
              <Activity className="h-4 w-4 text-holo-mint" /> ACTIVITY FEED
            </p>
            <div className="space-y-1.5">
              {notifications.slice(0, 5).map((n) => (
                <p key={n.id} className="flex items-start gap-2 rounded-lg border border-white/6 bg-black/25 px-3 py-2 text-[11px] text-white/65">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-holo-cyan" />
                  {n.text} <span className="ml-auto shrink-0 font-mono text-[9px] text-white/30">{n.time}</span>
                </p>
              ))}
              {notifications.length === 0 && <p className="py-3 text-center text-xs text-white/35">No activity yet.</p>}
            </div>
          </div>
        );

      case "bio":
        return (
          <div className="glass rounded-3xl p-4">
            <p className="text-[13px] leading-relaxed text-white/70">{profile.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.badges.map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full border border-holo-gold/30 bg-holo-gold/10 px-2.5 py-1 text-[10px] font-bold text-holo-gold">
                  <Award className="h-2.5 w-2.5" /> {b}
                </span>
              ))}
            </div>
          </div>
        );
    }
  }
}

/* --------------------------- COLLECTOR --------------------------- */
function CollectorProfile({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { users, userById, follows, connections, toggleFollow, toggleConnection, posts, slabs, collection } = useVca();
  const user = userById(userId);
  const [tab, setTab] = useState<Tab>("cards");

  if (!users.some((u) => u.id === userId)) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p className="text-sm font-bold text-white/70">Collector not found</p>
        <button onClick={() => navigate("/discover")} className="mt-3 rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-xs font-bold text-void">
          Discover collectors
        </button>
      </div>
    );
  }

  const items = collection.filter((i) => i.ownerId === userId && !i.wishlist);
  const wishlist = collection.filter((i) => i.ownerId === userId && i.wishlist);
  const theirPosts = posts.filter((p) => p.userId === userId);
  const theirSlabs = slabs.filter((s) => s.ownerName === user.displayName);
  const isFollowing = Boolean(follows[userId]);
  const isConnected = Boolean(connections[userId]);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl">
        <div className="relative h-36 animate-holo-shift bg-[linear-gradient(110deg,#08251c,#131a3f,#2a0f38,#232b06,#08251c)] bg-[length:300%_300%] sm:h-44">
          <div className="absolute inset-0 grid-bg opacity-70" />
          <div className="starfield absolute inset-0 opacity-70" />
        </div>
        <div className="glass-strong relative -mt-12 rounded-b-3xl px-5 pb-5">
          <div className="flex items-end justify-between">
            <div className="-mt-8 flex items-end gap-4">
              <Avatar displayName={user.displayName} hue={user.avatarHue} size="xl" online={user.online} className="rounded-full ring-4 ring-void" />
              <div className="pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-display text-xl font-extrabold text-white">{user.displayName}</h1>
                  <BadgeCheck className="h-5 w-5 fill-holo-cyan text-void" />
                </div>
                <p className="text-xs text-white/45">@{user.username}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
            <MapPin className="h-3 w-3" /> {user.location}
            <span className="ml-2 font-mono text-holo-cyan">LVL {user.level} COLLECTOR</span>
            <span className="ml-2">Joined {user.joined}</span>
          </p>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/70">{user.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.badges.map((b) => (
              <span key={b} className="flex items-center gap-1 rounded-full border border-holo-gold/30 bg-holo-gold/10 px-2.5 py-1 text-[10px] font-bold text-holo-gold">
                <Award className="h-2.5 w-2.5" /> {b}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => toggleFollow(userId)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-95",
                isFollowing ? "border border-white/15 bg-white/5 text-white/60" : "bg-gradient-to-r from-holo-cyan to-holo-violet text-void",
              )}
            >
              <ThumbsUp className="h-3 w-3" /> {isFollowing ? "FOLLOWING" : "FOLLOW"}
            </button>
            <button
              onClick={() => toggleConnection(userId)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-95",
                isConnected ? "border border-holo-mint/40 bg-holo-mint/10 text-holo-mint" : "border border-white/15 bg-white/5 text-white/75",
              )}
            >
              <UserPlus className="h-3 w-3" /> {isConnected ? "CONNECTED" : "ADD CONNECTION"}
            </button>
            <Link
              to={`/messenger?user=${userId}`}
              className="flex items-center gap-1.5 rounded-full border border-holo-magenta/40 bg-holo-magenta/10 px-4 py-2 text-[11px] font-bold text-holo-magenta transition-all active:scale-95"
            >
              <MessageCircle className="h-3 w-3" /> MESSAGE
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icon: Layers, label: "Cards", value: String(user.stats.cards), accent: "text-holo-cyan" },
              { icon: Gem, label: "Graded", value: String(user.stats.graded), accent: "text-holo-gold" },
              { icon: Wallet, label: "Collection Value", value: usd(user.stats.value), accent: "text-holo-mint" },
              { icon: Heart, label: "Favorites", value: String(user.stats.favorites), accent: "text-holo-magenta" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/8 bg-black/30 p-3">
                <s.icon className={cn("h-4 w-4", s.accent)} />
                <p className="mt-1.5 font-display text-base font-extrabold text-white">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProfileTabs
        tab={tab}
        setTab={setTab}
        items={items}
        wishlist={wishlist}
        posts={theirPosts}
        slabs={theirSlabs}
        onOpenCard={(id) => navigate(`/card/${id}`)}
      />
    </div>
  );
}

/* --------------------------- SHARED TABS --------------------------- */
function ProfileTabs({
  tab,
  setTab,
  items,
  wishlist,
  posts,
  slabs,
  onOpenCard,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  items: { id: string; cardId: string; grade: GradeLabel | null; serial: string | null; slab: string }[];
  wishlist: { id: string; cardId: string; grade: GradeLabel | null; serial: string | null }[];
  posts: Parameters<typeof PostCard>[0]["post"][];
  slabs: { id: string; serial: string; kind: string; cardId: string; grade: string | null; createdAt: string }[];
  onOpenCard: (cardId: string) => void;
}) {
  const TABS: { id: Tab; label: string }[] = [
    { id: "cards", label: "Cards" },
    { id: "posts", label: "Posts" },
    { id: "slabs", label: "Slabs" },
    { id: "wishlist", label: "Wishlist" },
  ];

  return (
    <div className="space-y-4">
      <div className="glass flex w-fit gap-1 rounded-full p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[11px] font-bold transition-all",
              tab === t.id ? "bg-holo-cyan/20 text-holo-cyan" : "text-white/45 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cards" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => {
            const c = cardById(i.cardId);
            if (!c) return null;
            return <CardArt key={i.id} card={c} grade={i.grade} serial={i.serial} onClick={() => onOpenCard(c.id)} />;
          })}
          {items.length === 0 && <p className="col-span-full py-6 text-center text-xs text-white/35">No cards visible — collection may be private.</p>}
        </div>
      )}

      {tab === "posts" && (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 && <p className="py-6 text-center text-xs text-white/35">No posts yet.</p>}
        </div>
      )}

      {tab === "slabs" && (
        <div className="space-y-2">
          {slabs.map((s) => {
            const c = cardById(s.cardId);
            if (!c) return null;
            return (
              <div key={s.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <img src={c.artUrl} alt={c.name} className="h-12 w-9 rounded-md object-cover ring-1 ring-holo-cyan/30" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{c.name} · {s.grade ?? "AWAITING GRADE"}</p>
                  <p className="font-mono text-[10px] text-holo-cyan">{s.serial}</p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold", s.kind === "physical" ? "border-holo-gold/40 text-holo-gold" : "border-holo-magenta/40 text-holo-magenta")}>
                  {s.kind === "physical" ? "NFC" : "DIGITAL"}
                </span>
              </div>
            );
          })}
          {slabs.length === 0 && (
            <p className="py-6 text-center text-xs text-white/35">No slabs yet — create one in the Slab Creator.</p>
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {wishlist.map((i) => {
            const c = cardById(i.cardId);
            if (!c) return null;
            return (
              <div key={i.id} className="relative">
                <CardArt card={c} onClick={() => onOpenCard(c.id)} />
                <span className="absolute left-1.5 top-1.5 z-20 flex items-center gap-1 rounded-full bg-void/80 px-2 py-1 font-mono text-[8px] font-bold text-holo-gold backdrop-blur">
                  <Star className="h-2.5 w-2.5 fill-holo-gold" /> WISHLIST
                </span>
              </div>
            );
          })}
          {wishlist.length === 0 && (
            <p className="col-span-full flex items-center justify-center gap-2 py-6 text-xs text-white/35">
              <Star className="h-3.5 w-3.5" /> Wishlist is empty.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
