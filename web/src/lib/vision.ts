import { CATALOG, cardById } from "@/lib/data";
import { sameProduct } from './identity';

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
  language?: string;
  printing?: string;
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

const PROMPT = `You identify Pokemon trading cards from photos. You do NOT authenticate or grade physical cards.
Analyze the card photo and respond with ONLY valid JSON (no markdown fences, no prose) in this exact shape:
{"identified": boolean, "name": string, "set": string, "number": string, "rarity": string, "holo": boolean, "year": string|null, "verdict": "authentic"|"suspect"|"counterfeit", "confidence": number, "summary": string, "signals": [{"label": string, "ok": boolean, "note": string}]}
Rules:
- confidence describes identification certainty only, not authenticity.
- Return language and printing fields when readable; otherwise use Unknown and Unconfirmed.
- Read the full collector number, retaining prefixes such as TG, GG, SV and the denominator. Do not guess unreadable text or sets.
- signals must contain only visible observations (legible text, visible wear, glare). NEVER claim to measure card stock, thickness, layers, print rosettes, or authenticity.
- verdict must always be suspect, meaning unverified by physical inspection.
- If not recognizable, identified=false, confidence=0 and explain what photo is needed.
- summary must describe identification limits and visible observations only.`;

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
  if (!blob) throw new Error('The identification service returned an incomplete result. Retry the photo or search by name.');
  const p = JSON.parse(blob) as Record<string, unknown>;
  const confidenceRaw = Number(p.confidence);
  return {
    identified: p.identified === true,
    name: String(p.name ?? "Unknown card").trim(),
    setName: String(p.set ?? "Unknown set").trim(),
    number: String(p.number ?? "—").trim(),
    rarity: String(p.rarity ?? "—").trim(),
    holo: Boolean(p.holo),
    year: typeof p.year === "string" || typeof p.year === "number" ? String(p.year) : null,
    language: typeof p.language === 'string' ? p.language : 'Unknown',
    printing: typeof p.printing === 'string' ? p.printing : 'Unconfirmed',
    verdict: 'suspect',
    confidence: Number.isFinite(confidenceRaw)
      ? Math.min(100, Math.max(0, Math.round(confidenceRaw)))
      : 50,
    signals: asSignals(p.signals),
    summary: String(p.summary ?? "Screening complete.").trim(),
    matchedCardId: null,
  };
};

/** Matches exact name, set and collector number; user confirmation is still required. */
export function matchCatalog(analysis: ScanAnalysis): ScanAnalysis {
  const hits = CATALOG.filter(c => sameProduct(c, { name: analysis.name, set: analysis.setName, number: analysis.number }));
  return { ...analysis, matchedCardId: analysis.identified && hits.length === 1 ? hits[0].id : null };
}

/** Runs the vision analysis against the Rork Toolkit proxy. */
export async function analyzeCardImage(dataUrl: string, signal?: AbortSignal): Promise<ScanAnalysis> {
  const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
    method: "POST",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.2,
      max_tokens: 3000,
      reasoning: { max_tokens: 512, exclude: true },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'card_identification', strict: true,
          schema: {
            type: 'object', additionalProperties: false,
            required: ['identified', 'name', 'set', 'number', 'rarity', 'holo', 'year', 'language', 'printing', 'verdict', 'confidence', 'summary', 'signals'],
            properties: {
              identified: { type: 'boolean' }, name: { type: 'string' }, set: { type: 'string' }, number: { type: 'string' }, rarity: { type: 'string' }, holo: { type: 'boolean' }, year: { type: ['string', 'null'] }, language: { type: 'string' }, printing: { type: 'string' }, verdict: { type: 'string', enum: ['suspect'] }, confidence: { type: 'number' }, summary: { type: 'string' },
              signals: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'ok', 'note'], properties: { label: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } } } },
            },
          },
        },
      },
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
  if (!res.ok) throw new Error(res.status === 429 ? 'Vision is busy. Please wait a moment and retry.' : res.status === 401 || res.status === 403 ? 'Vision access could not be authorized. Reload the app and retry.' : 'Vision service could not complete the request. Retry or search manually.');
  const json: unknown = await res.json();
  const finish = (json as { choices?: { finish_reason?: string }[] }).choices?.[0]?.finish_reason;
  if (finish === 'length') throw new Error('Identification was cut short. Retry with a clear crop or search manually.');
  if (finish === 'content_filter') throw new Error('This photo could not be analyzed. Try a different card photo.');
  return matchCatalog(parseAnalysis(extractContent(json)));
}

export { cardById };
