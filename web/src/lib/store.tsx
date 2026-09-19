import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  CATALOG,
  COLLECTION,
  CONVERSATIONS,
  CURRENT_USER_ID,
  NOTIFICATIONS,
  POSTS,
  USERS,
  cardById,
  userById,
} from "./data";
import {
  insertProfileMedia,
  insertScanRecord,
  deleteProfileMedia,
  listProfileBlocks,
  listProfileMedia,
  listScanHistory,
  listVaultSlabs,
  saveProfileBlocks,
  upsertVaultSlab,
} from "./db";
import { isBackendReady } from "./supabase";
import type {
  CatalogCard,
  CollectionItem,
  Comment,
  Conversation,
  GradeLabel,
  MarketplaceAccount,
  Post,
  ProfileBlockDef,
  ProfileBlockKind,
  ProfileMediaItem,
  ScanHistoryRecord,
  SlabRecord,
  SlabStatus,
  User,
  VcaNotification,
  VaultSlabRow,
} from "./types";

interface ScanResult {
  cardId: string;
  passed: boolean;
  confidence: number;
  signals: { label: string; ok: boolean }[];
  flaggedReason?: string;
}

interface VcaStore {
  users: User[];
  currentUser: User;
  collection: CollectionItem[];
  posts: Post[];
  conversations: Conversation[];
  notifications: VcaNotification[];
  slabs: SlabRecord[];
  follows: Record<string, boolean>;
  connections: Record<string, boolean>;
  lastScan: ScanResult | null;
  marketplace: Record<string, MarketplaceAccount>;
  slabDraftCardId: string | null;
  /* serial generation */
  nextDigitalSerial: () => string;
  nextPhysicalSerial: () => string;
  /* collection */
  addToCollection: (cardId: string, opts?: { grade?: GradeLabel | null; slab?: SlabStatus }) => string;
  toggleFavorite: (itemId: string) => void;
  toggleWishlistItem: (itemId: string) => void;
  createDigitalSlab: (cardId: string, grade?: GradeLabel | null) => SlabRecord;
  sendToGrading: (cardId: string) => SlabRecord;
  activatePhysicalSlab: (recordId: string) => void;
  /* social */
  addPost: (text: string, card?: { cardId: string; serial?: string | null; grade?: GradeLabel | null; caption?: string }) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  sharePost: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  toggleConnection: (userId: string) => void;
  /* messaging */
  sendMessage: (conversationId: string, text: string, cardId?: string) => void;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => void;
  markConversationRead: (conversationId: string) => void;
  /* notifications */
  markNotificationsRead: () => void;
  pushNotification: (n: Omit<VcaNotification, "id" | "time" | "read">) => void;
  /* scanning */
  setLastScan: (r: ScanResult | null) => void;
  setSlabDraftCardId: (id: string | null) => void;
  /* marketplace */
  connectMarketplace: (platformId: string, handle: string) => void;
  disconnectMarketplace: (platformId: string) => void;
  syncMarketplace: (platformId: string) => void;
  /* profile building blocks (Supabase-backed) */
  profileBlocks: ProfileBlockDef[];
  profileMedia: ProfileMediaItem[];
  scanHistory: ScanHistoryRecord[];
  backendReady: boolean;
  addBlock: (kind: ProfileBlockKind) => void;
  moveBlock: (id: string, dir: -1 | 1) => void;
  removeBlock: (id: string) => void;
  addProfileMedia: (m: { mediaType: "image" | "link"; title: string; url: string; caption?: string | null }) => void;
  removeProfileMedia: (id: string) => void;
  recordScan: (r: Omit<ScanHistoryRecord, "id" | "createdAt">) => void;
  /* helpers */
  cardById: (id: string) => CatalogCard | undefined;
  userById: (id: string) => User;
  myItems: () => CollectionItem[];
  collectionValue: () => number;
}

const VcaContext = createContext<VcaStore | null>(null);

let idCounter = 100;
const uid = (prefix: string) => `${prefix}-${idCounter++}`;

const fmt = (n: number) => String(n).padStart(4, "0");

const SEED_SLABS: SlabRecord[] = [
  { id: "s1", serial: "VCA-D-26-0104", kind: "digital", cardId: "charizard-base", itemId: "i1", grade: "VCA 10", ownerName: "Todd", createdAt: "2026-09-14" },
  { id: "s2", serial: "VCA-26-A-0001", kind: "physical", cardId: "gyarados-base", grade: "VCA 10", ownerName: "Kenji", createdAt: "2026-09-12" },
];

const DEFAULT_BLOCKS: ProfileBlockDef[] = [
  { id: "b-stats", kind: "stats" },
  { id: "b-featured", kind: "featured" },
  { id: "b-media", kind: "media" },
  { id: "b-links", kind: "links" },
  { id: "b-activity", kind: "activity" },
];

const slabValue = (card: CatalogCard | undefined, grade: GradeLabel | null): number => {
  if (!card) return 0;
  if (grade === "VCA 10") return card.prices.g10;
  if (grade === "VCA 9") return card.prices.g9;
  if (grade === "VCA 8") return card.prices.g8;
  return card.prices.raw;
};

export function VcaProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>(USERS);
  const [collection, setCollection] = useState<CollectionItem[]>(COLLECTION);
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [notifications, setNotifications] = useState<VcaNotification[]>(NOTIFICATIONS);
  const [slabs, setSlabs] = useState<SlabRecord[]>(SEED_SLABS);
  const [follows, setFollows] = useState<Record<string, boolean>>({ "u-guru": true, "u-bella": true });
  const [connections, setConnections] = useState<Record<string, boolean>>({ "u-guru": true });
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [slabDraftCardId, setSlabDraftCardId] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<Record<string, MarketplaceAccount>>({
    ebay: {
      platformId: "ebay",
      handle: "vca_vault_todd",
      connectedAt: "2026-08-30",
      listings: 14,
      sold30d: 6,
      revenue30d: 2340,
      lastSynced: "2h ago",
    },
  });

  const serialRef = useMemo(() => ({ digital: 122, physical: 2 }), []);

  const currentUser = users.find((u) => u.isSelf) ?? users[0];

  const nextDigitalSerial = useCallback(() => {
    const serial = `VCA-D-26-${fmt(serialRef.digital++)}`;
    return serial;
  }, [serialRef]);

  const nextPhysicalSerial = useCallback(() => {
    return `VCA-26-A-${fmt(serialRef.physical++)}`;
  }, [serialRef]);

  const pushNotification = useCallback((n: Omit<VcaNotification, "id" | "time" | "read">) => {
    setNotifications((prev) => [{ id: uid("n"), time: "now", read: false, ...n }, ...prev]);
  }, []);

  const addToCollection = useCallback(
    (cardId: string, opts?: { grade?: GradeLabel | null; slab?: SlabStatus }) => {
      const itemId = uid("i");
      setCollection((prev) => [
        {
          id: itemId,
          cardId,
          ownerId: CURRENT_USER_ID,
          addedAt: new Date().toISOString().slice(0, 10),
          grade: opts?.grade ?? null,
          serial: null,
          slab: opts?.slab ?? "none",
          favorite: false,
          wishlist: false,
          quantity: 1,
        },
        ...prev,
      ]);
      return itemId;
    },
    [],
  );

  const toggleFavorite = useCallback((itemId: string) => {
    setCollection((prev) => prev.map((i) => (i.id === itemId ? { ...i, favorite: !i.favorite } : i)));
  }, []);

  const toggleWishlistItem = useCallback((itemId: string) => {
    setCollection((prev) => prev.map((i) => (i.id === itemId ? { ...i, wishlist: !i.wishlist } : i)));
  }, []);

  const createDigitalSlab = useCallback(
    (cardId: string, grade: GradeLabel | null = "VCA 10") => {
      const serial = nextDigitalSerial();
      const itemId = addToCollection(cardId, { grade, slab: "digital" });
      setCollection((prev) => prev.map((i) => (i.id === itemId ? { ...i, serial } : i)));
      const record: SlabRecord = {
        id: uid("s"),
        serial,
        kind: "digital",
        cardId,
        itemId,
        grade,
        ownerName: currentUser.displayName,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setSlabs((prev) => [record, ...prev]);
      const c = cardById(cardId);
      void upsertVaultSlab({
        clientId: record.id,
        serial,
        kind: "digital",
        cardId,
        cardName: c?.name ?? "Unknown",
        cardSet: c?.set ?? null,
        cardArt: c?.artUrl ?? null,
        grade,
        value: slabValue(c, grade),
        ownerName: record.ownerName,
        mintedAt: new Date().toISOString(),
      });
      pushNotification({ kind: "slab", text: `Digital VCA slab ${serial} created for ${cardById(cardId)?.name ?? "card"}`, cardId });
      return record;
    },
    [addToCollection, currentUser.displayName, nextDigitalSerial, pushNotification],
  );

  const sendToGrading = useCallback(
    (cardId: string) => {
      const serial = nextPhysicalSerial();
      const itemId = addToCollection(cardId, { slab: "grading" });
      const record: SlabRecord = {
        id: uid("s"),
        serial,
        kind: "physical",
        cardId,
        itemId,
        grade: null,
        ownerName: currentUser.displayName,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setSlabs((prev) => [record, ...prev]);
      const gc = cardById(cardId);
      void upsertVaultSlab({
        clientId: record.id,
        serial,
        kind: "physical",
        cardId,
        cardName: gc?.name ?? "Unknown",
        cardSet: gc?.set ?? null,
        cardArt: gc?.artUrl ?? null,
        grade: null,
        value: 0,
        ownerName: record.ownerName,
        mintedAt: new Date().toISOString(),
      });
      pushNotification({ kind: "grade", text: `Grading submission received · ${cardById(cardId)?.name ?? "card"} · serial ${serial}`, cardId });
      return record;
    },
    [addToCollection, currentUser.displayName, nextPhysicalSerial, pushNotification],
  );

  const activatePhysicalSlab = useCallback(
    (recordId: string) => {
      setSlabs((prev) => prev);
      setCollection((prev) =>
        prev.map((i) =>
          slabs.find((s) => s.id === recordId)?.itemId === i.id
            ? { ...i, slab: "physical", grade: (i.grade ?? "VCA 10") as GradeLabel, serial: slabs.find((s) => s.id === recordId)?.serial ?? i.serial }
            : i,
        ),
      );
      pushNotification({ kind: "nfc", text: "NFC slab activated — tap any phone to open the digital profile" });
    },
    [pushNotification, slabs],
  );

  const addPost = useCallback(
    (text: string, card?: { cardId: string; serial?: string | null; grade?: GradeLabel | null; caption?: string }) => {
      const post: Post = {
        id: uid("p"),
        userId: CURRENT_USER_ID,
        time: "now",
        text,
        images: [],
        card,
        likes: 0,
        likedByMe: false,
        comments: [],
        shares: 0,
        saved: false,
        kind: card ? "post" : "post",
      };
      setPosts((prev) => [post, ...prev]);
    },
    [],
  );

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p)),
    );
  }, []);

  const toggleSave = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p)));
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
    const comment: Comment = { id: uid("c"), userId: CURRENT_USER_ID, text, time: "now" };
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)));
  }, []);

  const sharePost = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)));
  }, []);

  const toggleFollow = useCallback(
    (userId: string) => {
      setFollows((prev) => ({ ...prev, [userId]: !prev[userId] }));
      pushNotification({ kind: "follower", userId, text: `You ${follows[userId] ? "unfollowed" : "followed"} ${userById(userId).displayName}` });
    },
    [follows, pushNotification],
  );

  const toggleConnection = useCallback(
    (userId: string) => {
      setConnections((prev) => ({ ...prev, [userId]: !prev[userId] }));
    },
    [],
  );

  const sendMessage = useCallback((conversationId: string, text: string, cardId?: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, { id: uid("m"), fromMe: true, text, time: "now", cardId }] }
          : c,
      ),
    );
    /* simulated typing + reply */
    const replies = [
      "Haha that's an amazing pull 🔥",
      "Interesting — what did the scanner say about centering?",
      "Let me check my binder, I might have what you need.",
      "VCA grading turnaround is fast right now, worth it.",
      "Sending you a connection request!",
    ];
    window.setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, { id: uid("m"), fromMe: false, text: replies[Math.floor(Math.random() * replies.length)], time: "now" }] }
            : c,
        ),
      );
    }, 2200);
  }, []);

  const reactToMessage = useCallback((conversationId: string, messageId: string, emoji: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m)) }
          : c,
      ),
    );
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const myItems = useCallback(() => collection.filter((i) => i.ownerId === CURRENT_USER_ID), [collection]);

  const collectionValue = useCallback(() => {
    return myItems().reduce((sum, item) => {
      const card = cardById(item.cardId);
      if (!card) return sum;
      if (item.grade === "VCA 10") return sum + card.prices.g10;
      if (item.grade === "VCA 9") return sum + card.prices.g9;
      if (item.grade === "VCA 8") return sum + card.prices.g8;
      return sum + card.prices.raw;
    }, 0);
  }, [myItems]);

  const connectMarketplace = useCallback(
    (platformId: string, handle: string) => {
      setMarketplace((prev) => ({
        ...prev,
        [platformId]: {
          platformId,
          handle,
          connectedAt: new Date().toISOString().slice(0, 10),
          listings: 4 + Math.floor(Math.random() * 12),
          sold30d: Math.floor(Math.random() * 5),
          revenue30d: 180 + Math.floor(Math.random() * 900),
          lastSynced: "just now",
        },
      }));
      pushNotification({ kind: "connection", text: `Marketplace account connected — first sync complete.` });
    },
    [pushNotification],
  );

  const disconnectMarketplace = useCallback((platformId: string) => {
    setMarketplace((prev) => {
      const next = { ...prev };
      delete next[platformId];
      return next;
    });
  }, []);

  const syncMarketplace = useCallback((platformId: string) => {
    setMarketplace((prev) => {
      const acct = prev[platformId];
      if (!acct) return prev;
      return {
        ...prev,
        [platformId]: {
          ...acct,
          listings: acct.listings + Math.floor(Math.random() * 3),
          sold30d: acct.sold30d + Math.floor(Math.random() * 3),
          revenue30d: acct.revenue30d + Math.floor(Math.random() * 420),
          lastSynced: "just now",
        },
      };
    });
  }, []);

  /* ------------------- profile blocks / media / scans ------------------- */
  const [profileBlocks, setProfileBlocks] = useState<ProfileBlockDef[]>(DEFAULT_BLOCKS);
  const [profileMedia, setProfileMedia] = useState<ProfileMediaItem[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>([]);

  /* Load the Supabase-backed workspace once; seed the slab table from the
     local demo data on first run. */
  useEffect(() => {
    if (!isBackendReady) return;
    let cancelled = false;
    (async () => {
      const [rows, blocks, media, scans] = await Promise.all([
        listVaultSlabs(),
        listProfileBlocks(),
        listProfileMedia(),
        listScanHistory(),
      ]);
      if (cancelled) return;
      if (rows.length) {
        setSlabs((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          for (const r of rows) {
            if (map.has(r.clientId)) continue;
            map.set(r.clientId, {
              id: r.clientId,
              serial: r.serial,
              kind: r.kind,
              cardId: r.cardId ?? "unknown",
              grade: (r.grade as GradeLabel | null) ?? null,
              ownerName: r.ownerName,
              createdAt: r.mintedAt.slice(0, 10),
            });
          }
          return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        });
      } else {
        for (const s of SEED_SLABS) {
          const c = cardById(s.cardId);
          void upsertVaultSlab({
            clientId: s.id,
            serial: s.serial,
            kind: s.kind,
            cardId: s.cardId,
            cardName: c?.name ?? "Unknown",
            cardSet: c?.set ?? null,
            cardArt: c?.artUrl ?? null,
            grade: s.grade,
            value: slabValue(c, s.grade),
            ownerName: s.ownerName,
            mintedAt: new Date(`${s.createdAt}T12:00:00Z`).toISOString(),
          });
        }
      }
      if (blocks.length) setProfileBlocks(blocks);
      if (media.length) setProfileMedia(media);
      if (scans.length) setScanHistory(scans);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addBlock = useCallback((kind: ProfileBlockKind) => {
    setProfileBlocks((prev) => {
      if (prev.length >= 8) return prev;
      const next = [...prev, { id: `blk-${Date.now()}`, kind }];
      void saveProfileBlocks(next);
      return next;
    });
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setProfileBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      void saveProfileBlocks(next);
      return next;
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setProfileBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      void saveProfileBlocks(next);
      return next;
    });
  }, []);

  const addProfileMedia = useCallback(
    (m: { mediaType: "image" | "link"; title: string; url: string; caption?: string | null }) => {
      const item: ProfileMediaItem = {
        id: `pm-${Date.now()}`,
        mediaType: m.mediaType,
        title: m.title,
        url: m.url,
        caption: m.caption ?? null,
      };
      setProfileMedia((prev) => {
        void insertProfileMedia(item, prev.length);
        return [...prev, item];
      });
      pushNotification({
        kind: "slab",
        text: m.mediaType === "image" ? "Media uploaded to your profile gallery." : "Link added to your profile.",
      });
    },
    [pushNotification],
  );

  const removeProfileMedia = useCallback((id: string) => {
    setProfileMedia((prev) => prev.filter((m) => m.id !== id));
    void deleteProfileMedia(id);
  }, []);

  const recordScan = useCallback((r: Omit<ScanHistoryRecord, "id" | "createdAt">) => {
    const rec: ScanHistoryRecord = { ...r, id: `scan-${Date.now()}`, createdAt: new Date().toISOString() };
    setScanHistory((prev) => [rec, ...prev].slice(0, 100));
    void insertScanRecord(rec);
  }, []);

  const value: VcaStore = {
    users,
    currentUser,
    collection,
    posts,
    conversations,
    notifications,
    slabs,
    follows,
    connections,
    lastScan,
    marketplace,
    slabDraftCardId,
    nextDigitalSerial,
    nextPhysicalSerial,
    addToCollection,
    toggleFavorite,
    toggleWishlistItem,
    createDigitalSlab,
    sendToGrading,
    activatePhysicalSlab,
    addPost,
    toggleLike,
    toggleSave,
    addComment,
    sharePost,
    toggleFollow,
    toggleConnection,
    sendMessage,
    reactToMessage,
    markConversationRead,
    markNotificationsRead,
    pushNotification,
    setLastScan,
    setSlabDraftCardId,
    connectMarketplace,
    disconnectMarketplace,
    syncMarketplace,
    profileBlocks,
    profileMedia,
    scanHistory,
    backendReady: isBackendReady,
    addBlock,
    moveBlock,
    removeBlock,
    addProfileMedia,
    removeProfileMedia,
    recordScan,
    cardById,
    userById,
    myItems,
    collectionValue,
  };

  return <VcaContext.Provider value={value}>{children}</VcaContext.Provider>;
}

export function useVca(): VcaStore {
  const ctx = useContext(VcaContext);
  if (!ctx) throw new Error("useVca must be used within VcaProvider");
  return ctx;
}

export { CATALOG };
