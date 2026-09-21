import type { CatalogCard, CollectionItem, Conversation, Post, User, VcaNotification } from "./types";

/**
 * VCA product catalog — REAL Pokémon TCG cards only.
 *
 * Every entry is a real product: real name, real set, real card number, real
 * rarity, real release era, and official artwork served from pokemontcg.io
 * (https://images.pokemontcg.io/<setId>/<number>.png).
 *
 * `tcgCardId` carries the pokemontcg.io card id ("base1-4") — the real-product
 * key used for live market pricing (TCGPlayer raw market via pokemontcg.io,
 * PSA 10/9/8 graded prices via JustTCG). Seeded prices are honest estimates
 * labeled "Estimated Market Value" and refresh to live data when keys exist.
 */

const img = (setId: string, number: string) => `https://images.pokemontcg.io/${setId}/${number.split("/")[0]}.png`;

function history(base: number, metric: number, months: string[]) {
  const series = [0.78, 0.84, 0.8, 0.88, 0.92, 0.9, 0.97, 1.0].map((f) => Math.round(base * metric * f));
  return months.map((month, i) => ({ month, value: series[i] }));
}

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const PRICE_DATE = "Sep 19, 2026";
const SOURCE = "Illustrative catalog estimate — not verified sales";

interface Seed {
  id: string;
  ptcgId: string;
  name: string;
  pokemon: string;
  set: string;
  number: string;
  rarity: CatalogCard["rarity"];
  year: number;
  variant: string;
  type: CatalogCard["type"];
  artKey: string;
  prices: { raw: number; g10: number; g9: number; g8: number };
}

const SEEDS: Seed[] = [
  /* ---------------------------- Base Set (1999) ---------------------------- */
  { id: "charizard-base", ptcgId: "base1-4", name: "Charizard", pokemon: "Charizard", set: "Base Set", number: "4/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Fire", artKey: "ember", prices: { raw: 880, g10: 14500, g9: 3200, g8: 1500 } },
  { id: "blastoise-base", ptcgId: "base1-2", name: "Blastoise", pokemon: "Blastoise", set: "Base Set", number: "2/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Water", artKey: "tide", prices: { raw: 260, g10: 3600, g9: 850, g8: 420 } },
  { id: "venusaur-base", ptcgId: "base1-15", name: "Venusaur", pokemon: "Venusaur", set: "Base Set", number: "15/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Grass", artKey: "verdant", prices: { raw: 220, g10: 2900, g9: 700, g8: 350 } },
  { id: "mewtwo-base", ptcgId: "base1-10", name: "Mewtwo", pokemon: "Mewtwo", set: "Base Set", number: "10/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Psychic", artKey: "psy", prices: { raw: 120, g10: 950, g9: 320, g8: 190 } },
  { id: "gyarados-base", ptcgId: "base1-6", name: "Gyarados", pokemon: "Gyarados", set: "Base Set", number: "6/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Water", artKey: "tide", prices: { raw: 160, g10: 1250, g9: 380, g8: 210 } },
  { id: "alakazam-base", ptcgId: "base1-1", name: "Alakazam", pokemon: "Alakazam", set: "Base Set", number: "1/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Psychic", artKey: "psy", prices: { raw: 95, g10: 850, g9: 260, g8: 150 } },
  { id: "zapdos-base", ptcgId: "base1-16", name: "Zapdos", pokemon: "Zapdos", set: "Base Set", number: "16/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Electric", artKey: "volt", prices: { raw: 85, g10: 700, g9: 220, g8: 130 } },
  { id: "chansey-base", ptcgId: "base1-3", name: "Chansey", pokemon: "Chansey", set: "Base Set", number: "3/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Colorless", artKey: "abyss", prices: { raw: 70, g10: 620, g9: 210, g8: 120 } },
  { id: "machamp-base", ptcgId: "base1-8", name: "Machamp", pokemon: "Machamp", set: "Base Set", number: "8/102", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Fighting", artKey: "ember", prices: { raw: 22, g10: 120, g9: 45, g8: 28 } },
  { id: "charmander-base", ptcgId: "base1-46", name: "Charmander", pokemon: "Charmander", set: "Base Set", number: "46/102", rarity: "Common", year: 1999, variant: "Unlimited", type: "Fire", artKey: "ember", prices: { raw: 55, g10: 520, g9: 170, g8: 95 } },
  { id: "squirtle-base", ptcgId: "base1-60", name: "Squirtle", pokemon: "Squirtle", set: "Base Set", number: "60/102", rarity: "Common", year: 1999, variant: "Unlimited", type: "Water", artKey: "tide", prices: { raw: 45, g10: 450, g9: 150, g8: 85 } },
  { id: "bulbasaur-base", ptcgId: "base1-63", name: "Bulbasaur", pokemon: "Bulbasaur", set: "Base Set", number: "63/102", rarity: "Common", year: 1999, variant: "Unlimited", type: "Grass", artKey: "verdant", prices: { raw: 40, g10: 420, g9: 140, g8: 80 } },
  { id: "pikachu-base", ptcgId: "base1-58", name: "Pikachu", pokemon: "Pikachu", set: "Base Set", number: "58/102", rarity: "Common", year: 1999, variant: "Unlimited · Red Cheeks", type: "Electric", artKey: "volt", prices: { raw: 28, g10: 260, g9: 95, g8: 55 } },
  /* ----------------------------- Jungle (1999) ----------------------------- */
  { id: "flareon-jungle", ptcgId: "jungle-3", name: "Flareon", pokemon: "Flareon", set: "Jungle", number: "3/64", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Fire", artKey: "ember", prices: { raw: 48, g10: 480, g9: 160, g8: 90 } },
  { id: "jolteon-jungle", ptcgId: "jungle-4", name: "Jolteon", pokemon: "Jolteon", set: "Jungle", number: "4/64", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Electric", artKey: "volt", prices: { raw: 52, g10: 520, g9: 175, g8: 100 } },
  { id: "vaporeon-jungle", ptcgId: "jungle-12", name: "Vaporeon", pokemon: "Vaporeon", set: "Jungle", number: "12/64", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Water", artKey: "tide", prices: { raw: 55, g10: 540, g9: 180, g8: 105 } },
  { id: "snorlax-jungle", ptcgId: "jungle-11", name: "Snorlax", pokemon: "Snorlax", set: "Jungle", number: "11/64", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Colorless", artKey: "abyss", prices: { raw: 40, g10: 380, g9: 130, g8: 75 } },
  /* ----------------------------- Fossil (1999) ----------------------------- */
  { id: "dragonite-fossil", ptcgId: "fossil-4", name: "Dragonite", pokemon: "Dragonite", set: "Fossil", number: "4/62", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Colorless", artKey: "abyss", prices: { raw: 60, g10: 600, g9: 200, g8: 115 } },
  { id: "aerodactyl-fossil", ptcgId: "fossil-1", name: "Aerodactyl", pokemon: "Aerodactyl", set: "Fossil", number: "1/62", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Fighting", artKey: "ember", prices: { raw: 45, g10: 420, g9: 145, g8: 85 } },
  { id: "gengar-fossil", ptcgId: "fossil-5", name: "Gengar", pokemon: "Gengar", set: "Fossil", number: "5/62", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Psychic", artKey: "psy", prices: { raw: 50, g10: 470, g9: 155, g8: 90 } },
  { id: "zapdos-fossil", ptcgId: "fossil-15", name: "Zapdos", pokemon: "Zapdos", set: "Fossil", number: "15/62", rarity: "Holo Rare", year: 1999, variant: "Unlimited · Holo", type: "Electric", artKey: "volt", prices: { raw: 38, g10: 330, g9: 115, g8: 68 } },
  /* --------------------------- Team Rocket (2000) -------------------------- */
  { id: "dark-charizard-tr", ptcgId: "teamrocket-4", name: "Dark Charizard", pokemon: "Charizard", set: "Team Rocket", number: "4/82", rarity: "Holo Rare", year: 2000, variant: "Unlimited · Holo", type: "Fire", artKey: "ember", prices: { raw: 95, g10: 900, g9: 280, g8: 160 } },
  /* ------------------------ Darkness Ablaze (2020) ------------------------- */
  { id: "charizard-vmax-da", ptcgId: "swsh3-20", name: "Charizard VMAX", pokemon: "Charizard", set: "Darkness Ablaze", number: "20/189", rarity: "Rare Holo VMAX", year: 2020, variant: "Holo", type: "Fire", artKey: "ember", prices: { raw: 130, g10: 480, g9: 190, g8: 120 } },
  /* ----------------------- Champion's Path (2020) -------------------------- */
  { id: "charizard-vmax-cp", ptcgId: "swsh35-74", name: "Charizard VMAX", pokemon: "Charizard", set: "Champion's Path", number: "74/73", rarity: "Rare Holo VMAX", year: 2020, variant: "Secret · Holo", type: "Fire", artKey: "ember", prices: { raw: 340, g10: 1100, g9: 420, g8: 260 } },
  /* ----------------------- Evolving Skies (2022) --------------------------- */
  { id: "umbreon-vmax-es", ptcgId: "swsh7-215", name: "Umbreon VMAX", pokemon: "Umbreon", set: "Evolving Skies", number: "215/203", rarity: "Rare Rainbow", year: 2022, variant: "Alt Art · Holo", type: "Darkness", artKey: "psy", prices: { raw: 2280, g10: 4400, g9: 1900, g8: 1150 } },
  { id: "umbreon-v-es", ptcgId: "swsh7-203", name: "Umbreon V", pokemon: "Umbreon", set: "Evolving Skies", number: "203/203", rarity: "Rare Holo V", year: 2022, variant: "Alt Art · Holo", type: "Darkness", artKey: "psy", prices: { raw: 320, g10: 850, g9: 380, g8: 240 } },
  /* -------------------------- Scarlet & Violet 151 -------------------------- */
  { id: "charizard-ex-151", ptcgId: "sv3pt5-199", name: "Charizard ex", pokemon: "Charizard", set: "151", number: "199/165", rarity: "Rare Holo ex", year: 2023, variant: "Special Illustration Rare", type: "Fire", artKey: "ember", prices: { raw: 90, g10: 380, g9: 150, g8: 95 } },
  { id: "pikachu-ex-151", ptcgId: "sv3pt5-173", name: "Pikachu", pokemon: "Pikachu", set: "151", number: "173/165", rarity: "Rare Holo ex", year: 2023, variant: "Special Illustration Rare", type: "Electric", artKey: "volt", prices: { raw: 55, g10: 260, g9: 105, g8: 68 } },
];

const ART = {
  ember: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/759bb147-848c-4b81-94c2-8bcaaa8e6eba.png",
  tide: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/69b0841e-2cc3-4126-a254-35d14897af83.png",
  verdant: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/92a75ecc-24bd-40f9-a34b-9938c891d74c.png",
  volt: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/d408858d-d994-4523-a75a-518a5c994379.png",
  psy: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/9834be7f-3b5a-43fd-a2ac-1beb55eca62d.png",
  abyss: "https://r2-pub.rork.com/projects/6cu1lfh2z1a14gllh5wnf/assets/09ec5d79-d9c9-49c3-9a53-f6fde3d57aa1.png",
};

const languageFor = (year: number) => (year >= 2020 ? "English · Worldwide" : "English");

export const CATALOG: CatalogCard[] = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  pokemon: s.pokemon,
  set: s.set,
  number: s.number,
  rarity: s.rarity,
  year: s.year,
  language: languageFor(s.year),
  variant: s.variant,
  type: s.type,
  artKey: s.artKey,
  /* Official real-card artwork from pokemontcg.io; the generated holo art is the fallback backdrop. */
  artUrl: img(s.ptcgId.split("-")[0], s.number),
  tcgCardId: s.ptcgId,
  prices: s.prices,
  priceDate: PRICE_DATE,
  priceSource: SOURCE,
  history: [],
  historyMetric: "VCA 10",
}));

const indexedCards = new Map<string, CatalogCard>();
/** Registers confirmed records beyond the bundled catalog for all existing card views. */
export function registerCards(cards: CatalogCard[]): void { for (const card of cards) indexedCards.set(card.id, card); }
export function clearIndexedCards(): void { indexedCards.clear(); }
export const cardById = (id: string): CatalogCard | undefined => indexedCards.get(id) ?? CATALOG.find((c) => c.id === id);

export const USERS: User[] = [
  {
    id: "u-todd",
    username: "toddslabs",
    displayName: "Todd",
    bio: "Base Set chaser since '99. VCA believer. If it's not slabbed, it's not finished. 🔥",
    location: "Austin, TX",
    favoritePokemon: "Charizard",
    favoriteSet: "Base Set",
    level: 12,
    joined: "2024",
    online: true,
    badges: ["Founding Collector", "Grading Pro", "Holo Hunter", "Base Set Master"],
    stats: { cards: 247, graded: 42, value: 18240, favorites: 18 },
    avatarHue: 190,
    isSelf: true,
  },
  {
    id: "u-bella",
    username: "basesetbella",
    displayName: "Bella",
    bio: "WOTC era only. Shadowless enthusiast. Currently hunting a PSA-equivalent VCA 10 Venusaur.",
    location: "Toronto, CA",
    favoritePokemon: "Venusaur",
    favoriteSet: "Base Set",
    level: 9,
    joined: "2024",
    online: true,
    badges: ["Holo Hunter", "Early Adopter"],
    stats: { cards: 183, graded: 27, value: 9450, favorites: 12 },
    avatarHue: 130,
  },
  {
    id: "u-max",
    username: "shinyhuntermax",
    displayName: "Max",
    bio: "Modern sets + Japanese exclusives. My scanner runs hotter than my Charizard.",
    location: "Berlin, DE",
    favoritePokemon: "Pikachu",
    favoriteSet: "151",
    level: 7,
    joined: "2025",
    online: false,
    badges: ["Scanner Ace", "Community Pick"],
    stats: { cards: 412, graded: 15, value: 6210, favorites: 22 },
    avatarHue: 55,
  },
  {
    id: "u-guru",
    username: "gradingguru",
    displayName: "Kenji",
    bio: "Grading analyst. I look at print lines the way other people look at sunsets.",
    location: "Osaka, JP",
    favoritePokemon: "Mewtwo",
    favoriteSet: "Base Set",
    level: 15,
    joined: "2024",
    online: true,
    badges: ["Grading Pro", "Founding Collector", "Authenticity Lab"],
    stats: { cards: 96, graded: 88, value: 24800, favorites: 9 },
    avatarHue: 275,
  },
];

export const userById = (id: string): User => USERS.find((u) => u.id === id) ?? USERS[0];

export const CURRENT_USER_ID = "u-todd";

export const COLLECTION: CollectionItem[] = [
  { id: "i1", cardId: "charizard-base", ownerId: "u-todd", addedAt: "2026-09-14", grade: "VCA 10", serial: "VCA-D-26-0104", slab: "digital", favorite: true, wishlist: false, quantity: 1 },
  { id: "i2", cardId: "charizard-base", ownerId: "u-todd", addedAt: "2026-08-30", grade: null, serial: null, slab: "none", favorite: false, wishlist: false, quantity: 1 },
  { id: "i3", cardId: "blastoise-base", ownerId: "u-todd", addedAt: "2026-09-02", grade: "VCA 9", serial: "VCA-D-26-0091", slab: "digital", favorite: false, wishlist: false, quantity: 1 },
  { id: "i4", cardId: "venusaur-base", ownerId: "u-todd", addedAt: "2026-07-19", grade: "VCA 8", serial: "VCA-D-26-0066", slab: "digital", favorite: false, wishlist: false, quantity: 1 },
  { id: "i5", cardId: "gyarados-base", ownerId: "u-todd", addedAt: "2026-09-10", grade: null, serial: null, slab: "none", favorite: true, wishlist: false, quantity: 1 },
  { id: "i6", cardId: "pikachu-base", ownerId: "u-todd", addedAt: "2026-06-05", grade: "VCA 10", serial: "VCA-D-26-0031", slab: "physical", favorite: true, wishlist: false, quantity: 1 },
  { id: "i7", cardId: "mewtwo-base", ownerId: "u-todd", addedAt: "2026-05-21", grade: null, serial: null, slab: "none", favorite: false, wishlist: true, quantity: 1 },
  { id: "i8", cardId: "umbreon-vmax-es", ownerId: "u-todd", addedAt: "2026-09-16", grade: null, serial: null, slab: "none", favorite: true, wishlist: false, quantity: 1 },
  { id: "i9", cardId: "charizard-vmax-cp", ownerId: "u-todd", addedAt: "2026-08-11", grade: "VCA 9", serial: "VCA-D-26-0077", slab: "digital", favorite: false, wishlist: false, quantity: 1 },
  { id: "i10", cardId: "charizard-base", ownerId: "u-bella", addedAt: "2026-09-08", grade: "VCA 9", serial: "VCA-D-26-0117", slab: "digital", favorite: true, wishlist: false, quantity: 1 },
  { id: "i11", cardId: "venusaur-base", ownerId: "u-bella", addedAt: "2026-08-22", grade: "VCA 10", serial: "VCA-D-26-0110", slab: "digital", favorite: false, wishlist: false, quantity: 1 },
  { id: "i12", cardId: "gyarados-base", ownerId: "u-guru", addedAt: "2026-09-12", grade: "VCA 10", serial: "VCA-26-A-0001", slab: "physical", favorite: true, wishlist: false, quantity: 1 },
  { id: "i13", cardId: "mewtwo-base", ownerId: "u-guru", addedAt: "2026-09-01", grade: "VCA 10", serial: "VCA-26-A-0002", slab: "physical", favorite: false, wishlist: false, quantity: 1 },
  { id: "i14", cardId: "pikachu-base", ownerId: "u-max", addedAt: "2026-09-16", grade: null, serial: null, slab: "none", favorite: false, wishlist: false, quantity: 1 },
  { id: "i15", cardId: "umbreon-v-es", ownerId: "u-max", addedAt: "2026-09-15", grade: "VCA 8", serial: "VCA-D-26-0121", slab: "digital", favorite: true, wishlist: false, quantity: 1 },
];

export const POSTS: Post[] = [
  {
    id: "p1",
    userId: "u-todd",
    time: "2h",
    text: "Just added this Base Set Charizard to my collection 🔥 TCGPlayer market has it at $880 raw. Now the real question… shouldislab says the PSA math — slab it or send it in?",
    images: [],
    card: { cardId: "charizard-base", grade: null, serial: null, caption: "NEW ADDITION" },
    likes: 84,
    likedByMe: false,
    comments: [
      { id: "c1", userId: "u-bella", text: "That centering 👀 send it to VCA", time: "1h" },
      { id: "c2", userId: "u-max", text: "GEM MINT potential for sure", time: "48m" },
    ],
    shares: 6,
    saved: false,
    kind: "post",
  },
  {
    id: "p2",
    userId: "u-guru",
    time: "5h",
    text: "VCA 10 — GEM MINT 💎 The print lines on this Gyarados are flawless. Physical NFC slab just activated.",
    images: [],
    card: { cardId: "gyarados-base", grade: "VCA 10", serial: "VCA-26-A-0001", caption: "NEW GRADE · VCA 10" },
    likes: 212,
    likedByMe: true,
    comments: [{ id: "c3", userId: "u-todd", text: "Absolute stunner. Congrats Kenji!", time: "4h" }],
    shares: 18,
    saved: true,
    kind: "grade",
  },
  {
    id: "p3",
    userId: "u-max",
    time: "8h",
    text: "Scanned the Moonbreon tonight. $2,280 raw, $4,400 at PSA 10 — shouldislab verdict: SLAB IT, and honestly the math checks out. The scanner even caught the off-center back on my Pikachu.",
    images: [],
    card: { cardId: "umbreon-vmax-es", grade: null, serial: null, caption: "SCANNER RESULT" },
    likes: 141,
    likedByMe: false,
    comments: [],
    shares: 9,
    saved: false,
    kind: "scan",
  },
  {
    id: "p4",
    userId: "u-bella",
    time: "12h",
    text: "Finally finished the Base Set holo starter trio 🌿 VCA 10 on the Venusaur sealed the deal.",
    images: [],
    card: { cardId: "venusaur-base", grade: "VCA 10", serial: "VCA-D-26-0110", caption: "TRIO COMPLETE" },
    likes: 156,
    likedByMe: false,
    comments: [{ id: "c4", userId: "u-guru", text: "The Venusaur is criminally underrated.", time: "9h" }],
    shares: 11,
    saved: false,
    kind: "slab",
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    userId: "u-bella",
    unread: 2,
    messages: [
      { id: "m1", fromMe: false, text: "Todd! Is that Base Charizard you scanned still raw?", time: "09:41" },
      { id: "m2", fromMe: true, text: "Yeah it is. Thinking about sending it to VCA for grading.", time: "09:45" },
      { id: "m3", fromMe: false, text: "Do it. I'll trade you my Dark Charizard if the grade comes back VCA 10 👀", time: "09:46" },
      { id: "m4", fromMe: false, text: "Also — do you still have that Venusaur slab?", time: "09:46" },
    ],
  },
  {
    id: "conv2",
    userId: "u-guru",
    unread: 0,
    messages: [
      { id: "m5", fromMe: true, text: "Kenji, what did your Gyarados grade at?", time: "Yesterday" },
      { id: "m6", fromMe: false, text: "VCA 10 Gem Mint. The NFC slab is gorgeous in person.", time: "Yesterday" },
      { id: "m7", fromMe: true, text: "Insane. Mine's going in next batch.", time: "Yesterday" },
    ],
  },
  {
    id: "conv3",
    userId: "u-max",
    unread: 1,
    messages: [
      { id: "m8", fromMe: false, text: "Check out this scan result — the price engine caught the Moonbreon up 14% this month", time: "08:12" },
    ],
  },
];

export const NOTIFICATIONS: VcaNotification[] = [
  { id: "n1", kind: "grade", text: "Your Pikachu Base Set returned from VCA grading: VCA 10 Gem Mint 💎", time: "1h", read: false, cardId: "pikachu-base" },
  { id: "n2", kind: "like", userId: "u-bella", text: "Bella liked your post about the Base Charizard", time: "2h", read: false },
  { id: "n3", kind: "connection", userId: "u-guru", text: "Kenji sent you a connection request", time: "5h", read: false },
  { id: "n4", kind: "price", text: "Price alert: Charizard Base Set (PSA 10) up 6.4% this week", time: "9h", read: true, cardId: "charizard-base" },
  { id: "n5", kind: "wishlist", text: "Wishlist match: Umbreon VMAX alt art appeared in Max's collection", time: "1d", read: true, cardId: "umbreon-vmax-es" },
];

export const TRENDING = [
  { cardId: "charizard-base", delta: "+6.4%", rank: 1 },
  { cardId: "umbreon-vmax-es", delta: "+5.2%", rank: 2 },
  { cardId: "gyarados-base", delta: "+4.1%", rank: 3 },
  { cardId: "charizard-vmax-cp", delta: "+2.8%", rank: 4 },
  { cardId: "blastoise-base", delta: "+1.9%", rank: 5 },
  { cardId: "mewtwo-base", delta: "-0.6%", rank: 6 },
];

export const ACTIVITY = [
  { userId: "u-guru", text: "activated NFC slab VCA-26-A-0001 · Gyarados VCA 10", time: "18m" },
  { userId: "u-bella", text: "completed the Base Set holo starter trio", time: "12h" },
  { userId: "u-max", text: "scanned 12 cards today", time: "14h" },
  { userId: "u-guru", text: "submitted 3 cards for VCA professional grading", time: "1d" },
  { userId: "u-bella", text: "created digital slab VCA-D-26-0110 · Venusaur VCA 10", time: "1d" },
];

export const SETS = ["Base Set", "Jungle", "Fossil", "Team Rocket", "Darkness Ablaze", "Champion's Path", "Evolving Skies", "151"];
