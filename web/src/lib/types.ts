export type GradeLabel = "VCA 10" | "VCA 9" | "VCA 8";

export type SlabStatus = "none" | "digital" | "physical" | "grading";

export type AuthStatus = "verified" | "unverified" | "flagged";

export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Holo Rare"
  | "Rare Holo V"
  | "Rare Holo VMAX"
  | "Rare Holo ex"
  | "Rare Rainbow";

export interface PricePoint {
  raw: number;
  g10: number;
  g9: number;
  g8: number;
}

export interface CatalogCard {
  id: string;
  name: string;
  pokemon: string;
  set: string;
  number: string;
  rarity: Rarity;
  year: number;
  language: string;
  variant: string;
  /** Pokémon energy type. */
  type:
    | "Fire"
    | "Water"
    | "Grass"
    | "Electric"
    | "Psychic"
    | "Fighting"
    | "Darkness"
    | "Colorless";
  artKey: string;
  artUrl: string;
  /** Real-product key: pokemontcg.io card id (e.g. "base1-4") used for live catalog pricing. */
  tcgCardId: string;
  prices: PricePoint;
  priceDate: string;
  priceSource: string;
  history: { month: string; value: number }[];
  historyMetric: GradeLabel;
}

export interface CollectionItem {
  id: string;
  cardId: string;
  ownerId: string;
  addedAt: string;
  grade: GradeLabel | null;
  serial: string | null;
  slab: SlabStatus;
  favorite: boolean;
  wishlist: boolean;
  quantity: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  favoritePokemon: string;
  favoriteSet: string;
  level: number;
  joined: string;
  online: boolean;
  badges: string[];
  stats: { cards: number; graded: number; value: number; favorites: number };
  avatarHue: number;
  isSelf?: boolean;
}

export interface PostCardAttachment {
  cardId: string;
  serial?: string | null;
  grade?: GradeLabel | null;
  caption?: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  time: string;
}

export interface Post {
  id: string;
  userId: string;
  time: string;
  text: string;
  images: string[];
  card?: PostCardAttachment;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
  shares: number;
  saved: boolean;
  kind: "post" | "scan" | "grade" | "slab";
}

export interface Message {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  cardId?: string;
  reaction?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  unread: number;
}

export type NotificationKind =
  | "connection"
  | "follower"
  | "like"
  | "comment"
  | "message"
  | "grade"
  | "slab"
  | "price"
  | "wishlist"
  | "nfc";

export interface VcaNotification {
  id: string;
  kind: NotificationKind;
  userId?: string;
  text: string;
  time: string;
  read: boolean;
  cardId?: string;
}

export interface SlabRecord {
  id: string;
  serial: string;
  kind: "digital" | "physical";
  cardId: string;
  itemId?: string;
  grade: GradeLabel | null;
  ownerName: string;
  createdAt: string;
}

export interface MarketplaceAccount {
  platformId: string;
  handle: string;
  connectedAt: string;
  listings: number;
  sold30d: number;
  revenue30d: number;
  lastSynced: string | null;
}

/* ------------------------- profile building blocks ------------------------- */

export type ProfileBlockKind = "stats" | "featured" | "media" | "links" | "activity" | "bio";

export interface ProfileBlockDef {
  id: string;
  kind: ProfileBlockKind;
}

export interface ProfileMediaItem {
  id: string;
  mediaType: "image" | "link";
  title: string;
  url: string;
  caption?: string | null;
}

/* ------------------------------ vault / scans ------------------------------ */

export interface VaultSlabRow {
  clientId: string;
  serial: string;
  kind: "digital" | "physical";
  cardId: string | null;
  cardName: string;
  cardSet: string | null;
  cardArt: string | null;
  grade: string | null;
  value: number;
  ownerName: string;
  mintedAt: string;
}

export interface ScanHistoryRecord {
  id: string;
  cardName: string;
  setName: string;
  number: string;
  rarity: string;
  verdict: "authentic" | "suspect" | "counterfeit";
  confidence: number;
  matchedCardId: string | null;
  verifiedProduct: boolean;
  createdAt: string;
}
