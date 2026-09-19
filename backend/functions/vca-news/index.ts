// VCA NEWS edge function — aggregates official Pokemon TCG news for the
// ticker. Tries live sources in order; falls back to a curated wire so the
// ticker always has headlines. No auth required (public read-only feed).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string | null;
}

const FALLBACK: NewsItem[] = [
  {
    title: "Pokemon TCG: Prismatic Evolutions wave continues across retailers",
    summary: "Eevee-themed special expansion keeps selling through — check official Pokemon Center restocks.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "POKEMON.COM",
    date: null,
  },
  {
    title: "VCA Vault: digital slab minting volume hits a new weekly high",
    summary: "Collectors minted more verified VCA 10 slabs this week than any week this quarter.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA WIRE",
    date: null,
  },
  {
    title: "Base Set holo prices hold firm as raw copies get authenticated",
    summary: "WOTC-era holos remain the backbone of graded portfolio value, market data shows.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "MARKET WIRE",
    date: null,
  },
  {
    title: "Counterfeit screening: rosette-pattern check catches new fake wave",
    summary: "VCA vision screening flagged a rise in reproduction holos — always verify before buying.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA LABS",
    date: null,
  },
  {
    title: "Grading submissions: NFC physical slabs now activate on tap",
    summary: "Tap any NFC slab to a phone to open its verified digital profile instantly.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA WIRE",
    date: null,
  },
];

let cache: { at: number; items: NewsItem[]; source: string } | null = null;
const TTL = 10 * 60 * 1000;

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const firstItems = (xml: string, source: string): NewsItem[] => {
  const out: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < 12) {
    const block = m[1];
    const pick = (tag: string) => {
      const t = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return t ? stripTags(t[1]) : "";
    };
    const title = pick("title");
    if (!title) continue;
    out.push({
      title,
      summary: pick("description").slice(0, 140),
      url: (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "https://www.pokemon.com/us/pokemon-news").trim(),
      source,
      date: pick("pubDate") || null,
    });
  }
  return out;
};

async function trySource(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "VCA-Slabook/1.0 (+news ticker)", accept: "application/json, application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`${source} HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    const items = firstItems(text, source);
    if (!items.length) throw new Error(`${source} empty rss`);
    return items;
  }
  const json = JSON.parse(text) as unknown;
  const arr = Array.isArray(json)
    ? json
    : Array.isArray((json as { news?: unknown[] }).news)
      ? (json as { news: unknown[] }).news
      : Array.isArray((json as { articles?: unknown[] }).articles)
        ? (json as { articles: unknown[] }).articles
        : [];
  const items = (arr as Record<string, unknown>[])
    .slice(0, 12)
    .map((n) => ({
      title: String(n.title ?? n.headline ?? "").trim(),
      summary: String(n.short ?? n.description ?? n.excerpt ?? "").slice(0, 140),
      url: String(n.url ?? n.link ?? "https://www.pokemon.com/us/pokemon-news"),
      source,
      date: (n.date as string) ?? null,
    }))
    .filter((n) => n.title);
  if (!items.length) throw new Error(`${source} empty json`);
  return items;
}

const SOURCES: { url: string; source: string }[] = [
  { url: "https://www.pokemon.com/api/prd/news", source: "POKEMON.COM" },
  { url: "https://blog.pokemoncenter.com/feed/", source: "POKEMON CENTER" },
  { url: "https://www.nintendolife.com/feeds/latest", source: "NINTENDO LIFE" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (cache && Date.now() - cache.at < TTL) {
      return new Response(JSON.stringify({ live: cache.source !== "VCA WIRE", source: cache.source, items: cache.items }), { headers: CORS });
    }
    for (const s of SOURCES) {
      try {
        const items = await trySource(s.url, s.source);
        cache = { at: Date.now(), items, source: s.source };
        return new Response(JSON.stringify({ live: true, source: s.source, items }), { headers: CORS });
      } catch {
        // try next source
      }
    }
    cache = { at: Date.now(), items: FALLBACK, source: "VCA WIRE" };
    return new Response(JSON.stringify({ live: false, source: "VCA WIRE", items: FALLBACK }), { headers: CORS });
  } catch (_e) {
    return new Response(JSON.stringify({ live: false, source: "VCA WIRE", items: FALLBACK }), { headers: CORS });
  }
});
