/**
 * VCA Set Index — internal aggregated index of notable Pokémon TCG sets.
 *
 * Scores are the platform's own aggregated collector metrics (estimate-only):
 * - rarityIndex: concentration of rare/holo/ultra-rare cards in the set (0-100)
 * - demandIndex: current collector demand (0-100)
 * - rating:      VCA collector rating (0-10)
 * - avgG10:      average estimated VCA-10 value across the set's top 5 cards (USD)
 */

export interface SetIndexEntry {
  id: string;
  name: string;
  year: number;
  era: string;
  totalCards: number;
  rareCount: number;
  rarityIndex: number;
  demandIndex: number;
  rating: number;
  avgG10: number;
  topCard: string;
  topCardValue: number;
  /** 30-day demand trend, %. */
  trend: number;
  symbol: string;
}

export const SET_INDEX: SetIndexEntry[] = [
  { id: "base", name: "Base Set", year: 1999, era: "WOTC Classic", totalCards: 102, rareCount: 16, rarityIndex: 98, demandIndex: 97, rating: 9.8, avgG10: 9200, topCard: "Charizard #4", topCardValue: 9500, trend: 6.2, symbol: "⚡" },
  { id: "jungle", name: "Jungle", year: 1999, era: "WOTC Classic", totalCards: 64, rareCount: 16, rarityIndex: 88, demandIndex: 82, rating: 9.1, avgG10: 1600, topCard: "Flareon #3", topCardValue: 1400, trend: 3.4, symbol: "🌿" },
  { id: "fossil", name: "Fossil", year: 1999, era: "WOTC Classic", totalCards: 62, rareCount: 14, rarityIndex: 84, demandIndex: 76, rating: 8.7, avgG10: 1050, topCard: "Dragonite #4", topCardValue: 1200, trend: 2.8, symbol: "🦴" },
  { id: "team-rocket", name: "Team Rocket", year: 2000, era: "WOTC Classic", totalCards: 83, rareCount: 13, rarityIndex: 90, demandIndex: 91, rating: 9.4, avgG10: 3800, topCard: "Dark Charizard #4", topCardValue: 8200, trend: 7.9, symbol: "🖤" },
  { id: "neo-genesis", name: "Neo Genesis", year: 2000, era: "WOTC Neo", totalCards: 111, rareCount: 13, rarityIndex: 78, demandIndex: 85, rating: 9.0, avgG10: 2200, topCard: "Lugia #9", topCardValue: 5200, trend: 4.1, symbol: "🪶" },
  { id: "neo-destiny", name: "Neo Destiny", year: 2002, era: "WOTC Neo", totalCards: 105, rareCount: 18, rarityIndex: 92, demandIndex: 80, rating: 8.9, avgG10: 2600, topCard: "Shining Charizard 107", topCardValue: 9800, trend: 5.6, symbol: "✨" },
  { id: "legendary-collection", name: "Legendary Collection", year: 2002, era: "WOTC Late Era", totalCards: 110, rareCount: 9, rarityIndex: 74, demandIndex: 68, rating: 8.2, avgG10: 900, topCard: "Charizard (Reverse)", topCardValue: 2400, trend: 1.9, symbol: "🔥" },
  { id: "ex-deoxys", name: "EX Deoxys", year: 2005, era: "EX Series", totalCards: 107, rareCount: 11, rarityIndex: 86, demandIndex: 72, rating: 8.4, avgG10: 2400, topCard: "Rayquaza Gold Star", topCardValue: 6400, trend: 6.8, symbol: "🌟" },
  { id: "hgss", name: "HeartGold & SoulSilver", year: 2010, era: "HGSS Era", totalCards: 123, rareCount: 12, rarityIndex: 80, demandIndex: 78, rating: 8.8, avgG10: 1300, topCard: "Lugia LEGEND", topCardValue: 1900, trend: 2.2, symbol: " 雷" },
  { id: "bw-base", name: "Black & White", year: 2011, era: "BW Era", totalCards: 114, rareCount: 8, rarityIndex: 62, demandIndex: 60, rating: 7.8, avgG10: 480, topCard: "Reshiram #114", topCardValue: 700, trend: 0.8, symbol: "⚪" },
  { id: "xy-evolutions", name: "XY Evolutions", year: 2016, era: "XY Era", totalCards: 108, rareCount: 12, rarityIndex: 76, demandIndex: 93, rating: 9.2, avgG10: 1900, topCard: "Charizard 11/108", topCardValue: 3400, trend: 8.4, symbol: "🎴" },
  { id: "burning-shadows", name: "Burning Shadows", year: 2017, era: "Sun & Moon", totalCards: 147, rareCount: 14, rarityIndex: 72, demandIndex: 88, rating: 8.6, avgG10: 950, topCard: "Charizard GX Hyper Rare", topCardValue: 2600, trend: 5.1, symbol: "🌋" },
  { id: "hidden-fates", name: "Hidden Fates", year: 2019, era: "Sun & Moon", totalCards: 94, rareCount: 94, rarityIndex: 82, demandIndex: 95, rating: 9.3, avgG10: 640, topCard: "Shiny Charizard GX SV49", topCardValue: 1400, trend: 9.6, symbol: "🗝️" },
  { id: "champions-path", name: "Champion's Path", year: 2020, era: "Sword & Shield", totalCards: 80, rareCount: 13, rarityIndex: 70, demandIndex: 84, rating: 8.3, avgG10: 520, topCard: "Charizard VMAX 079", topCardValue: 1100, trend: 4.7, symbol: "🏆" },
  { id: "shining-fates", name: "Shining Fates", year: 2021, era: "Sword & Shield", totalCards: 190, rareCount: 122, rarityIndex: 84, demandIndex: 87, rating: 8.9, avgG10: 420, topCard: "Shiny Charizard VMAX SV107", topCardValue: 950, trend: 3.9, symbol: "💫" },
  { id: "pokemon-go", name: "Pokémon GO", year: 2022, era: "Sword & Shield", totalCards: 88, rareCount: 9, rarityIndex: 64, demandIndex: 74, rating: 7.6, avgG10: 210, topCard: "Charizard V 150", topCardValue: 260, trend: 1.4, symbol: "📱" },
  { id: "sv151", name: "Scarlet & Violet 151", year: 2023, era: "Scarlet & Violet", totalCards: 165, rareCount: 31, rarityIndex: 78, demandIndex: 96, rating: 9.5, avgG10: 560, topCard: "Charizard ex SIR 199", topCardValue: 1900, trend: 7.2, symbol: "🔴" },
  { id: "crown-zenith", name: "Crown Zenith", year: 2023, era: "Sword & Shield", totalCards: 160, rareCount: 34, rarityIndex: 74, demandIndex: 83, rating: 8.5, avgG10: 300, topCard: "Charizard V 154", topCardValue: 380, trend: 3.1, symbol: "👑" },
  { id: "prismatic", name: "Prismatic Evolutions", year: 2025, era: "Scarlet & Violet", totalCards: 181, rareCount: 44, rarityIndex: 88, demandIndex: 98, rating: 9.6, avgG10: 480, topCard: "Umbreon ex SIR 161", topCardValue: 1600, trend: 12.4, symbol: "🌙" },
  { id: "twilight-masquerade", name: "Twilight Masquerade", year: 2024, era: "Scarlet & Violet", totalCards: 226, rareCount: 28, rarityIndex: 66, demandIndex: 71, rating: 8.0, avgG10: 240, topCard: "Greninja ex SIR 214", topCardValue: 850, trend: 6.3, symbol: "🎭" },
];

export type SetSortKey = "rarity" | "demand" | "rating" | "value";

export const SET_SORTS: { key: SetSortKey; label: string }[] = [
  { key: "rarity", label: "MOST RARE" },
  { key: "demand", label: "HIGHEST DEMAND" },
  { key: "rating", label: "TOP RATED" },
  { key: "value", label: "MOST VALUABLE" },
];

const METRIC: Record<SetSortKey, (s: SetIndexEntry) => number> = {
  rarity: (s) => s.rarityIndex,
  demand: (s) => s.demandIndex,
  rating: (s) => s.rating,
  value: (s) => s.avgG10,
};

/** Sets ranked by the chosen metric (highest first). */
export function rankSets(sort: SetSortKey, query = ""): SetIndexEntry[] {
  const q = query.trim().toLowerCase();
  return [...SET_INDEX]
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.era.toLowerCase().includes(q) || String(s.year).includes(q))
    .sort((a, b) => METRIC[sort](b) - METRIC[sort](a));
}
