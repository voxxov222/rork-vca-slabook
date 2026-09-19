export type GradeLabel = "VCA 10" | "VCA 9" | "VCA 8";

export type SlabStatus = "none" | "digital" | "physical" | "grading";

export type AuthStatus = "verified" | "unverified" | "flagged";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Holo Rare";

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
  type: "Fire" | "Water" | "Grass" | "Electric" | "Psychic";
  artKey: string;
  artUrl: string;
  /** JustTCG card slug for live market pricing (e.g. "pokemon-base-set-charizard-holo-rare"). */
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
