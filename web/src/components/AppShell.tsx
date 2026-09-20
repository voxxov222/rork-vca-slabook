import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BellRing,
  Compass,
  Gem,
  Heart,
  Home,
  Layers,
  MessageCircle,
  ScanLine,
  Search,
  Sparkles,
  Store,
  Terminal,
  ThumbsUp,
  User as UserIcon,
} from "lucide-react";

import Avatar from "@/components/Avatar";
import VcaComputerDrawer from "@/components/VcaComputerDrawer";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/slabook", label: "Slabook", icon: Sparkles },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/collection", label: "Collection", icon: Layers },
  { to: "/slab-creator", label: "Slab Creator", icon: Gem },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/set-index", label: "Set Index", icon: BarChart3 },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/messenger", label: "Messenger", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/admin", label: "VCA OS", icon: Terminal },
];

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/slabook", label: "Slabook", icon: Sparkles },
  { to: "/scanner", label: "Scan", icon: ScanLine },
  { to: "/collection", label: "Cards", icon: Layers },
  { to: "/profile", label: "You", icon: UserIcon },
];

const NOTIF_ICON = {
  connection: { icon: ThumbsUp, color: "text-holo-cyan bg-holo-cyan/15" },
  follower: { icon: UserIcon, color: "text-holo-violet bg-holo-violet/15" },
  like: { icon: Heart, color: "text-holo-magenta bg-holo-magenta/15" },
  comment: { icon: MessageCircle, color: "text-holo-cyan bg-holo-cyan/15" },
  message: { icon: MessageCircle, color: "text-holo-cyan bg-holo-cyan/15" },
  grade: { icon: Gem, color: "text-holo-gold bg-holo-gold/15" },
  slab: { icon: Layers, color: "text-holo-magenta bg-holo-magenta/15" },
  price: { icon: Bell, color: "text-holo-mint bg-holo-mint/15" },
  wishlist: { icon: Heart, color: "text-holo-magenta bg-holo-magenta/15" },
  nfc: { icon: BellRing, color: "text-holo-gold bg-holo-gold/15" },
} as const;

function Logo() {
  return (
    <Link to="/home" className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-holo-cyan/30 via-holo-violet/25 to-holo-magenta/30 ring-1 ring-white/20">
        <span className="font-display text-xs font-extrabold tracking-widest holo-text">VCA</span>
      </span>
      <span className="font-display text-sm font-bold tracking-wide">
        <span className="text-white">VCA</span> <span className="holo-text">SLABOOK</span>
      </span>
    </Link>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markNotificationsRead, userById, cardById } = useVca();
  useEffect(() => {
    const t = window.setTimeout(markNotificationsRead, 1200);
    return () => window.clearTimeout(t);
  }, [markNotificationsRead]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="glass-strong fixed right-3 top-14 z-50 w-[340px] max-w-[calc(100vw-24px)] animate-fade-up overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <p className="font-display text-xs font-bold tracking-wider text-white/90">NOTIFICATIONS</p>
          <button onClick={markNotificationsRead} className="text-[10px] font-semibold text-holo-cyan hover:underline">
            Mark all read
          </button>
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.map((n) => {
            const meta = NOTIF_ICON[n.kind];
            const user = n.userId ? userById(n.userId) : null;
            const card = n.cardId ? cardById(n.cardId) : null;
            return (
              <Link
                key={n.id}
                to={card ? `/card/${card.id}` : user ? `/collector/${user.id}` : "/"}
                onClick={onClose}
                className={cn("flex items-start gap-3 border-b border-white/4 px-4 py-3 transition-colors hover:bg-white/5", !n.read && "bg-holo-cyan/4")}
              >
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.color)}>
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs leading-snug text-white/80">{n.text}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-white/35">{n.time}</p>
                </div>
                {!n.read && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-holo-cyan shadow-[0_0_8px_rgba(45,226,255,0.9)]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function AppShell() {
  const { currentUser, notifications, conversations } = useVca();
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMsgs = conversations.reduce((s, c) => s + c.unread, 0);

  /* scroll to top on navigation */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  /* close notifications when route changes */
  useEffect(() => setNotifOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* ambient layer */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="grid-bg absolute inset-0" />
        <div className="starfield absolute inset-0 opacity-40" />
      </div>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/6 bg-void/70 backdrop-blur-xl lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-gradient-to-r from-holo-cyan/15 to-transparent text-white ring-1 ring-holo-cyan/25"
                    : "text-white/50 hover:bg-white/5 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("h-4.5 w-4.5 h-[18px] w-[18px] transition-transform group-hover:scale-110", isActive && "text-holo-cyan")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/profile"
          className="m-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 p-2.5 transition-colors hover:bg-white/8"
        >
          <Avatar displayName={currentUser.displayName} hue={currentUser.avatarHue} size="md" online />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{currentUser.displayName}</p>
            <p className="truncate font-mono text-[9px] text-holo-cyan">LVL {currentUser.level} COLLECTOR</p>
          </div>
        </Link>
      </aside>

      {/* mobile top bar */}
      <header className="glass-strong safe-bottom sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        <Logo />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/discover")}
            className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Discover & search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/messenger")}
            className="relative rounded-full p-2 text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Messenger"
          >
            <MessageCircle className="h-5 w-5" />
            {unreadMsgs > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-holo-magenta font-mono text-[8px] font-bold text-white">
                {unreadMsgs}
              </span>
            )}
          </button>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-full p-2 text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 animate-pulse-glow items-center justify-center rounded-full bg-holo-cyan font-mono text-[8px] font-bold text-void">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* desktop top-right actions */}
      <div className="fixed right-5 top-4 z-30 hidden items-center gap-2 lg:flex">
        <Link
          to="/discover"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
          aria-label="Discover"
        >
          <Search className="h-4 w-4" />
        </Link>
        <Link
          to="/messenger"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
          aria-label="Messenger"
        >
          <MessageCircle className="h-4 w-4" />
          {unreadMsgs > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-holo-magenta" />}
        </Link>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifs > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 animate-pulse-glow items-center justify-center rounded-full bg-holo-cyan font-mono text-[8px] font-bold text-void">
              {unreadNotifs}
            </span>
          )}
        </button>
      </div>

      {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}

      {/* admin-only popup side menu with VCA Computer tools */}
      <VcaComputerDrawer />

      {/* content */}
      <main className="px-4 pb-28 pt-4 lg:pb-10 lg:pl-64 lg:pr-6 lg:pt-6">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav with scan FAB */}
      <nav className="glass-strong safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/10 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {MOBILE_NAV.map(({ to, label, icon: Icon }, idx) =>
            idx === 2 ? (
              <div key="scan-fab" className="relative flex justify-center">
                <Link
                  to="/scanner"
                  aria-label="Open VCA Card Scanner"
                  className="absolute -top-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-cyan via-holo-violet to-holo-magenta shadow-[0_0_30px_rgba(53,182,255,0.5)] transition-transform active:scale-90"
                >
                  <ScanLine className="h-6 w-6 text-void" strokeWidth={2.5} />
                </Link>
                <span className="pb-2 pt-8 text-[9px] font-bold tracking-wider text-white/70">{label}</span>
              </div>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn("flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[9px] font-bold tracking-wider", isActive ? "text-holo-cyan" : "text-white/40")
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
