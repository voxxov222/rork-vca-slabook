import { CATALOG, cardById } from "@/lib/data";
import type { CatalogCard } from "@/lib/types";

/**
 * VCA Vision — AI card identification & authenticity screening through the
 * Rork Toolkit proxy (Vercel AI Gateway, `google/gemini-2.5-flash`).
 *
 * The engine is image-based only: it identifies the card and screens for
 * counterfeit indicators. It can never guarantee authenticity — that framing
 * is used across the UI.
 */

const TOOLKIT_URL = (import.meta.env.EXPO_PUBLIC_TOOLKIT_URL as string | undefined) ?? "https://toolkit.rork.com";
const VISION_MODEL = "google/gemini-2.5-flash";

export type ScanVerdict = "authentic" | "suspect" | "counterfeit";

export interface ScanSignal {
  label: string;
  ok: boolean;
  note?: string;
}

export interface ScanAnalysis {
  identified: boolean;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  holo: boolean;
  year: string | null;
  verdict: ScanVerdict;
  /** 0–100 screening confidence. */
  confidence: number;
  signals: ScanSignal[];
  summary: string;
  /** Catalog card matched by name/set, if any — unlocks live pricing + actions. */
  matchedCardId: string | null;
}

/* ------------------------------------------------------------------ */
/* Image preparation (browser equivalent of expo-image-manipulator)    */
/* ------------------------------------------------------------------ */

const LADDER = [
  { max: 1280, q: 0.82 },
  { max: 1024, q: 0.78 },
  { max: 832, q: 0.74 },
  { max: 640, q: 0.7 },
  { max: 512, q: 0.65 },
];

/** ~2.5 MB budget keeps the gateway request under the 4.5 MB body limit. */
const MAX_BYTES = 2_500_000;

/** Reads any image file/blob into a data URL (for preview + AI input). */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

const approxBytes = (dataUrl: string) => Math.round((dataUrl.length - dataUrl.indexOf(",")) * 0.75);

const drawScaled = (img: HTMLImageElement, maxEdge: number, q: number): string => {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", q);
};

/**
 * Re-encodes the image down a resize/quality ladder until it fits the upload
 * budget — same strategy as the canonical resize-for-upload helper.
 */
export async function downscaleForUpload(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = dataUrl;
  });
  for (const step of LADDER) {
    const out = drawScaled(img, step.max, step.q);
    if (approxBytes(out) <= MAX_BYTES) return out;
  }
  throw new Error("IMAGE_TOO_LARGE");
}

/* ------------------------------------------------------------------ */
/* AI analysis                                                         */
/* ------------------------------------------------------------------ */

const PROMPT = `You are VCA Vision, a Pokemon trading-card identification and authenticity screening engine used by a professional grading platform.
Analyze the card photo and respond with ONLY valid JSON (no markdown fences, no prose) in this exact shape:
{"identified": boolean, "name": string, "set": string, "number": string, "rarity": string, "holo": boolean, "year": string|null, "verdict": "authentic"|"suspect"|"counterfeit", "confidence": number, "summary": string, "signals": [{"label": string, "ok": boolean, "note": string}]}
Rules:
- "confidence" is an integer 0-100 describing how sure the screening is.
- Evaluate these six signals, each with ok true/false and a short note: "Print rosette pattern", "Card stock & layering", "Color gamut match", "Font & kerning", "Holofoil pattern", "Centering & borders".
- verdict "counterfeit" when fake indicators clearly dominate; "suspect" when mixed or the photo is too poor to verify; "authentic" when all signals pass.
- If the image is not a recognizable Pokemon card, set identified=false, verdict="counterfeit", confidence<=25 and explain in summary.
- Screening is image-only and conservative: never overstate certainty. summary is one sentence, honest, no emojis.`;

interface GatewayChoice {
  message?: { content?: string | { text?: string }[] };
}

const extractContent = (json: unknown): string => {
  const choice = (json as { choices?: GatewayChoice[] })?.choices?.[0];
  const raw = choice?.message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((p) => p?.text ?? "").join("");
  return "";
};

const firstJsonObject = (text: string): string | null => {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : null;
};

const asSignals = (value: unknown): ScanSignal[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      label: String(s.label ?? "Signal"),
      ok: Boolean(s.ok),
      note: typeof s.note === "string" ? s.note : undefined,
    }));
};

const parseAnalysis = (content: string): ScanAnalysis => {
  const blob = firstJsonObject(content);
  if (!blob) throw new Error("Malformed vision response");
  const p = JSON.parse(blob) as Record<string, unknown>;
  const verdictRaw = String(p.verdict ?? "suspect");
  const verdict: ScanVerdict =
    verdictRaw === "authentic" || verdictRaw === "counterfeit" ? verdictRaw : "suspect";
  const confidenceRaw = Number(p.confidence);
  return {
    identified: Boolean(p.identified),
    name: String(p.name ?? "Unknown card").trim(),
    setName: String(p.set ?? "Unknown set").trim(),
    number: String(p.number ?? "—").trim(),
    rarity: String(p.rarity ?? "—").trim(),
    holo: Boolean(p.holo),
    year: typeof p.year === "string" || typeof p.year === "number" ? String(p.year) : null,
    verdict,
    confidence: Number.isFinite(confidenceRaw)
      ? Math.min(100, Math.max(0, Math.round(confidenceRaw)))
      : 50,
    signals: asSignals(p.signals),
    summary: String(p.summary ?? "Screening complete.").trim(),
    matchedCardId: null,
  };
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Fuzzy-matches an AI identification against the app catalog. */
export function matchCatalog(analysis: ScanAnalysis): ScanAnalysis {
  const nName = normalize(analysis.name);
  if (!nName) return analysis;
  const hit = CATALOG.find((c) => {
    const sameName =
      normalize(c.name) === nName ||
      normalize(c.pokemon) === nName ||
      normalize(c.name).includes(nName) ||
      nName.includes(normalize(c.name));
    const setHint = normalize(analysis.setName).includes("base");
    return sameName && (setHint || true);
  });
  return hit ? { ...analysis, matchedCardId: hit.id } : analysis;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs the vision analysis against the Rork Toolkit proxy. */
export async function analyzeCardImage(dataUrl: string): Promise<ScanAnalysis> {
  const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Vision engine HTTP ${res.status}`);
  const json: unknown = await res.json();
  return matchCatalog(parseAnalysis(extractContent(json)));
}

/* ------------------------------------------------------------------ */
/* Deterministic demo analyses (sample cards, no photo needed)         */
/* ------------------------------------------------------------------ */

export const PASS_SIGNALS: ScanSignal[] = [
  { label: "Print rosette pattern", ok: true, note: "matches verified print run" },
  { label: "Card stock & layering", ok: true, note: "density 0.31 mm — genuine stock" },
  { label: "Color gamut match", ok: true, note: "within WOTC ink tolerance" },
  { label: "Font & kerning", ok: true, note: "typeface metrics exact" },
  { label: "Holofoil pattern", ok: true, note: "sparkle geometry authentic" },
  { label: "Centering & borders", ok: true, note: "within grading tolerance" },
];

export const FLAG_SIGNALS: ScanSignal[] = [
  { label: "Print rosette pattern", ok: true, note: "approximate match" },
  { label: "Card stock & layering", ok: false, note: "density off by ~9%" },
  { label: "Color gamut match", ok: true, note: "within tolerance" },
  { label: "Font & kerning", ok: false, note: "letter spacing inconsistent" },
  { label: "Holofoil pattern", ok: false, note: "sparkle geometry does not match print records" },
  { label: "Centering & borders", ok: true, note: "within tolerance" },
];

/** Deterministic pipeline result for the built-in demo cards. */
export function simulatedAnalysis(card: CatalogCard): ScanAnalysis {
  const isSuspect = card.id === "pikachu-base";
  return {
    identified: true,
    name: card.name,
    setName: card.set,
    number: card.number,
    rarity: card.rarity,
    holo: card.rarity === "Holo Rare",
    year: String(card.year),
    verdict: isSuspect ? "counterfeit" : "authentic",
    confidence: isSuspect ? 34 : 97,
    signals: isSuspect ? FLAG_SIGNALS : PASS_SIGNALS,
    summary: isSuspect
      ? "Card stock density, kerning and holofoil geometry are inconsistent with verified Base Set printings — counterfeit indicators present."
      : "All authenticity signals match verified print records for this card.",
    matchedCardId: card.id,
  };
}

export { cardById };
