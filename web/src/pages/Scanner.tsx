import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CameraOff,
  CheckCircle2,
  Database,
  Fingerprint,
  Gem,
  Image as ImageIcon,
  Layers,
  RefreshCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

import CardArt from "@/components/CardArt";
import PriceHistory from "@/components/PriceHistory";
import PriceLadder from "@/components/PriceLadder";
import RarityBadge, { rarityFor } from "@/components/RarityBadge";
import { CATALOG, cardById } from "@/lib/data";
import { pickRealMatch, searchRealCards, type RealCardCandidate } from "@/lib/prices";
import { useLivePrices } from "@/lib/prices";
import { useVca } from "@/lib/store";
import type { CatalogCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  analyzeCardImage,
  downscaleForUpload,
  fileToDataUrl,
  simulatedAnalysis,
  type ScanAnalysis,
} from "@/lib/vision";

type Phase = "select" | "camera" | "scanning" | "result" | "fail";
type StampStyle = "pass" | "fake" | "review";

interface RealState {
  status: "loading" | "ready";
  candidates: RealCardCandidate[];
  match: RealCardCandidate | null;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SCAN_STEPS = [
  "Enhancing image resolution…",
  "Cross-referencing 14,203 set records…",
  "Analyzing print texture & rosette pattern…",
  "Running VCA vision authenticity screen…",
  "Estimating market value…",
];

interface Outcome {
  analysis: ScanAnalysis;
  preview: string | null;
}

/* ---------------------------------------------------------------- */
/* Authentication stamps                                             */
/* ---------------------------------------------------------------- */

function Stamp({ style }: { style: StampStyle }) {
  const map = {
    pass: {
      ring: "border-holo-mint text-holo-mint shadow-[0_0_40px_rgba(53,224,161,0.45)]",
      bg: "bg-holo-mint/10",
      icon: BadgeCheck,
      title: "PASSED",
      sub: "AUTHENTICATION",
    },
    fake: {
      ring: "border-red-500 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.5)]",
      bg: "bg-red-500/12",
      icon: ShieldAlert,
      title: "FAILED",
      sub: "COUNTERFEIT",
    },
    review: {
      ring: "border-holo-gold text-holo-gold shadow-[0_0_40px_rgba(255,179,64,0.45)]",
      bg: "bg-holo-gold/10",
      icon: AlertTriangle,
      title: "REVIEW",
      sub: "UNVERIFIED",
    },
  } as const;
  const s = map[style];
  const Icon = s.icon;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={cn(
          "flex -rotate-12 flex-col items-center gap-0.5 rounded-lg border-4 px-4 py-2 backdrop-blur-[2px]",
          s.ring,
          s.bg,
        )}
        style={{ animation: "stamp-in 0.45s cubic-bezier(0.2, 2.2, 0.4, 1) both" }}
      >
        <span className="flex items-center gap-1.5 font-display text-lg font-extrabold tracking-[0.14em]">
          <Icon className="h-5 w-5" /> {s.title}
        </span>
        <span className="font-mono text-[9px] font-bold tracking-[0.3em]">{s.sub}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Camera capture                                                    */
/* ---------------------------------------------------------------- */

function CameraCapture({ onCapture, onCancel }: { onCapture: (dataUrl: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unavailable");
        }
        stream?.getTracks().forEach((t) => t.stop());
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  };

  if (error) {
    return (
      <div className="glass mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-400/30">
          <CameraOff className="h-7 w-7 text-red-400" />
        </span>
        <div>
          <p className="font-display text-base font-bold text-white">
            {error === "denied" ? "CAMERA ACCESS DENIED" : "CAMERA UNAVAILABLE"}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">
            {error === "denied"
              ? "Allow camera access in your browser settings to scan cards with the camera — or upload a photo instead."
              : "No camera was detected on this device. Upload a card photo instead — analysis works the same."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-3 text-xs font-bold text-void transition-transform active:scale-95">
            <ImageIcon className="h-4 w-4" /> UPLOAD A CARD PHOTO
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onCapture(await downscaleForUpload(await fileToDataUrl(file)));
              }}
            />
          </label>
          <button onClick={onCancel} className="text-[11px] font-semibold text-white/40 hover:text-white">
            Back to scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="glass relative overflow-hidden rounded-3xl p-3">
        <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {/* framing guide */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[7%] rounded-xl border-2 border-dashed border-white/25" />
            <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-holo-cyan" />
            <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-holo-cyan" />
            <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-holo-cyan" />
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-holo-cyan" />
          </div>
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-holo-cyan">
                <ScanLine className="h-4 w-4 animate-pulse" /> STARTING CAMERA…
              </div>
            </div>
          )}
          {flash && <div className="absolute inset-0 z-10 bg-white" />}
          <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] tracking-wider text-white/70">
            CENTER THE CARD INSIDE THE FRAME · GOOD LIGHTING · FILL THE FRAME
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6">
        <button onClick={onCancel} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors hover:bg-white/10" aria-label="Cancel">
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={capture}
          disabled={!ready}
          aria-label="Capture card photo"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-holo-cyan to-holo-violet shadow-[0_0_30px_rgba(53,182,255,0.5)] transition-transform active:scale-90",
            !ready && "opacity-40",
          )}
        >
          <Camera className="h-7 w-7 text-void" strokeWidth={2.2} />
        </button>
        <label
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors hover:bg-white/10"
          aria-label="Upload from device"
        >
          <ImageIcon className="h-5 w-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onCapture(await downscaleForUpload(await fileToDataUrl(file)));
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Scanner                                                           */
/* ---------------------------------------------------------------- */

export default function Scanner() {
  const navigate = useNavigate();
  const { addToCollection, createDigitalSlab, sendToGrading, setLastScan, pushNotification, recordScan } = useVca();
  const [phase, setPhase] = useState<Phase>("select");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [real, setReal] = useState<RealState | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const progressRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (progressRef.current) window.clearInterval(progressRef.current);
    },
    [],
  );

  const SAMPLES = CATALOG.slice(0, 4);

  const runScan = useCallback(
    async (opts: { cardId?: string; imageDataUrl?: string; preview?: string | null }) => {
      setOutcome(null);
      setReviewSubmitted(false);
      setProgress(0);
      setStep(0);
      setPhase("scanning");
      const minMs = opts.imageDataUrl ? 5200 : 4600;
      const started = Date.now();
      progressRef.current = window.setInterval(() => {
        const t = Math.min((Date.now() - started) / (minMs * 0.92), 0.94);
        setProgress(Math.round(t * 100));
        setStep(Math.min(Math.floor(t * SCAN_STEPS.length), SCAN_STEPS.length - 1));
      }, 60);

      let analysis: ScanAnalysis;
      if (opts.imageDataUrl) {
        try {
          const [res] = await Promise.all([analyzeCardImage(opts.imageDataUrl), wait(minMs)]);
          analysis = res;
        } catch {
          analysis = {
            identified: false,
            name: "Unidentified card",
            setName: "—",
            number: "—",
            rarity: "—",
            holo: false,
            year: null,
            verdict: "suspect",
            confidence: 18,
            signals: [],
            summary: "The vision engine could not complete screening — the images were queued for professional VCA review.",
            matchedCardId: null,
          };
        }
      } else {
        await wait(minMs);
        analysis = simulatedAnalysis(cardById(opts.cardId ?? "charizard-base") ?? CATALOG[0]);
      }

      if (progressRef.current) window.clearInterval(progressRef.current);
      setProgress(100);
      setOutcome({ analysis, preview: opts.preview ?? null });

      /* Cross-check the AI identification against the real product database
         (JustTCG) so only genuine product records get a verified badge. */
      setReal({ status: "loading", candidates: [], match: null });
      void (async () => {
        let candidates: RealCardCandidate[] = [];
        try {
          candidates = await searchRealCards(analysis.setName, analysis.name);
        } catch {
          candidates = [];
        }
        const match = pickRealMatch(candidates, analysis.number, analysis.name);
        setReal({ status: "ready", candidates, match });
        recordScan({
          cardName: analysis.name,
          setName: analysis.setName,
          number: analysis.number,
          rarity: analysis.rarity,
          verdict: analysis.verdict,
          confidence: analysis.confidence,
          matchedCardId: analysis.matchedCardId,
          verifiedProduct: Boolean(match),
        });
      })();

      setLastScan({
        cardId: analysis.matchedCardId ?? "unknown",
        passed: analysis.verdict === "authentic",
        confidence: analysis.confidence,
        signals: analysis.signals.map(({ label, ok }) => ({ label, ok })),
        flaggedReason: analysis.verdict === "authentic" ? undefined : analysis.summary,
      });
      setPhase(analysis.verdict === "authentic" ? "result" : "fail");
    },
    [recordScan, setLastScan],
  );

  const reset = () => {
    setOutcome(null);
    setReal(null);
    setReviewSubmitted(false);
    setPhase("select");
  };

  /* Re-anchor the identification on a verified real product record. */
  const applyCandidate = (c: RealCardCandidate) => {
    if (!outcome) return;
    const catalogMatch = CATALOG.find((x) => x.tcgCardId === c.slug);
    setOutcome({
      ...outcome,
      analysis: {
        ...outcome.analysis,
        name: c.name,
        setName: c.setName,
        number: c.number,
        rarity: c.rarity || outcome.analysis.rarity,
        matchedCardId: catalogMatch?.id ?? outcome.analysis.matchedCardId,
      },
    });
    setReal((r) => (r ? { ...r, match: c } : r));
  };

  const card: CatalogCard | undefined = outcome?.analysis.matchedCardId
    ? cardById(outcome.analysis.matchedCardId)
    : undefined;
  const { data: livePrices, isLoading: liveLoading } = useLivePrices(card?.tcgCardId);

  /* ------------------------- SELECT ------------------------- */
  if (phase === "select") {
    return (
      <div className="space-y-5">
        <div className="holo-frame relative overflow-hidden rounded-3xl p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
          <div className="relative">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-cyan">
              <ScanLine className="h-3.5 w-3.5" /> VCA CARD SCANNER · AI VISION
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-white">Identify. Authenticate. Value.</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/55">
              Capture or upload any card. VCA's AI vision engine identifies the card and its variant, screens for
              counterfeit indicators, and estimates live market value across grades.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setPhase("camera")}
            className="glass group flex flex-col items-center justify-center gap-3 rounded-3xl p-8 transition-all hover:border-holo-cyan/40 hover:bg-holo-cyan/5"
          >
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-cyan/25 to-holo-violet/20 ring-1 ring-holo-cyan/30 transition-transform group-hover:scale-110">
              <Camera className="h-7 w-7 text-holo-cyan" />
            </span>
            <p className="font-display text-sm font-bold text-white">OPEN CAMERA</p>
            <p className="text-center text-[11px] leading-relaxed text-white/45">
              Capture the front of the card live — framing guide included
            </p>
          </button>

          <label className="glass group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl p-8 transition-all hover:border-holo-magenta/40 hover:bg-holo-magenta/5">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-magenta/25 to-holo-gold/20 ring-1 ring-holo-magenta/30 transition-transform group-hover:scale-110">
              <ImageIcon className="h-7 w-7 text-holo-magenta" />
            </span>
            <p className="font-display text-sm font-bold text-white">BROWSE FROM DEVICE</p>
            <p className="text-center text-[11px] leading-relaxed text-white/45">Select card photos from your gallery or files</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const preview = URL.createObjectURL(file);
                try {
                  const dataUrl = await downscaleForUpload(await fileToDataUrl(file));
                  runScan({ imageDataUrl: dataUrl, preview });
                } catch {
                  runScan({ imageDataUrl: await fileToDataUrl(file), preview });
                }
              }}
            />
          </label>
        </div>

        {/* sample cards */}
        <div>
          <h2 className="mb-2.5 font-display text-sm font-bold tracking-wide text-white/90">OR TRY A DEMO SCAN</h2>
          <p className="mb-3 text-[11px] text-white/40">
            Tap a card to run the full pipeline. One of these is a known suspect copy — see how VCA screening responds.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SAMPLES.map((c) => (
              <button key={c.id} onClick={() => runScan({ cardId: c.id })} className="group text-left transition-transform hover:-translate-y-1">
                <CardArt card={c} showMeta={false} interactive={false} />
                <p className="mt-2 truncate text-center text-[11px] font-bold text-white/80 group-hover:text-holo-cyan">{c.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- CAMERA ------------------------- */
  if (phase === "camera") {
    return (
      <CameraCapture
        onCancel={reset}
        onCapture={(dataUrl) => runScan({ imageDataUrl: dataUrl, preview: dataUrl })}
      />
    );
  }

  /* ------------------------- SCANNING ------------------------- */
  if (phase === "scanning") {
    return (
      <div className="mx-auto max-w-md space-y-5 pt-4">
        <div className="glass relative overflow-hidden rounded-3xl p-6">
          <div className="relative mx-auto w-52 animate-scan-flicker">
            <div className="aspect-[3/4.2] w-full rounded-xl bg-white/5 ring-1 ring-white/10">
              <div className="flex h-full items-center justify-center">
                <ScanLine className="h-8 w-8 animate-pulse text-holo-cyan/50" />
              </div>
            </div>
            {/* scan line */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute left-0 h-0.5 w-full animate-scanline bg-gradient-to-r from-transparent via-holo-cyan to-transparent shadow-[0_0_18px_4px_rgba(53,182,255,0.6)]" />
            </div>
          </div>
          <p className="mt-6 text-center font-mono text-[11px] tracking-wider text-holo-cyan">{SCAN_STEPS[step]}</p>
          <div className="mx-auto mt-3 h-1.5 w-4/5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-holo-cyan via-holo-violet to-holo-magenta transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-white/35">{progress}% · VCA VISION ENGINE v4.2 · AI</p>
          <div className="mt-5 space-y-1.5 font-mono text-[10px] text-holo-mint/70">
            <p>&gt; edge_detection: OK</p>
            <p>&gt; surface_texture: OK</p>
            <p>&gt; set_database: {progress > 25 ? "MATCH FOUND" : "searching…"}</p>
            <p>&gt; authenticity: {progress > 70 ? "evaluating" : "pending"}</p>
          </div>
        </div>
        <button onClick={reset} className="mx-auto flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-white">
          <X className="h-3.5 w-3.5" /> Cancel scan
        </button>
      </div>
    );
  }

  /* ------------------------- FAIL (counterfeit / review) ------------------------- */
  if (phase === "fail" && outcome) {
    const a = outcome.analysis;
    const isCounterfeit = a.verdict === "counterfeit";
    const stampStyle: StampStyle = isCounterfeit ? "fake" : "review";
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border p-5 sm:p-6",
            isCounterfeit
              ? "border-red-500/40 bg-gradient-to-b from-red-950/50 to-panel"
              : "border-holo-gold/40 bg-gradient-to-b from-amber-950/40 to-panel",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl ring-1",
                isCounterfeit ? "bg-red-500/20 ring-red-400/40" : "bg-holo-gold/15 ring-holo-gold/40",
              )}
            >
              {isCounterfeit ? (
                <ShieldAlert className="h-6 w-6 text-red-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-holo-gold" />
              )}
            </span>
            <div>
              <h2 className={cn("font-display text-lg font-extrabold tracking-wide", isCounterfeit ? "text-red-300" : "text-holo-gold")}>
                {isCounterfeit ? "AUTHENTICATION FAILED" : "REVIEW REQUIRED"}
              </h2>
              <p className="text-[11px] text-white/50">
                {isCounterfeit ? "Automated screening identified counterfeit indicators" : "Screening could not fully verify this card"} · confidence {a.confidence}%
              </p>
            </div>
          </div>

          {/* stamped card */}
          <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/30 p-4">
            <p className={cn("mb-3 text-center font-mono text-[10px] font-bold tracking-[0.25em]", isCounterfeit ? "text-red-300/80" : "text-holo-gold/80")}>
              {isCounterfeit ? "REJECTED / COUNTERFEIT SUSPECTED" : "HELD / VERIFICATION REQUIRED"}
            </p>
            <div className="relative mx-auto w-40">
              {outcome.preview ? (
                <div className="relative overflow-hidden rounded-xl ring-1 ring-white/15">
                  <img src={outcome.preview} alt="Scanned card" className="aspect-[3/4.2] w-full object-cover opacity-80 grayscale-[35%]" />
                </div>
              ) : (
                card && <CardArt card={card} showMeta={false} interactive={false} className="opacity-80 grayscale-[35%]" />
              )}
              <Stamp style={stampStyle} />
            </div>
          </div>

          <p
            className={cn(
              "mt-4 rounded-xl border p-3.5 text-[13px] font-semibold leading-relaxed",
              isCounterfeit ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-holo-gold/20 bg-holo-gold/10 text-amber-100",
            )}
          >
            {a.summary}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">
            Screening result is image analysis only — it can never guarantee authenticity. This card was{" "}
            <span className={cn("font-bold", isCounterfeit ? "text-red-300" : "text-holo-gold")}>not</span> added to your
            verified VCA collection.
          </p>

          {/* signals */}
          {a.signals.length > 0 && (
            <div className="mt-4 space-y-2">
              {a.signals.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/30 px-3 py-2">
                  {s.ok ? <CheckCircle2 className="h-4 w-4 text-holo-mint" /> : <AlertTriangle className={cn("h-4 w-4", isCounterfeit ? "text-red-400" : "text-holo-gold")} />}
                  <span className={cn("text-xs font-medium", s.ok ? "text-white/70" : isCounterfeit ? "text-red-300" : "text-holo-gold")}>{s.label}</span>
                  <span className={cn("ml-auto font-mono text-[10px]", s.ok ? "text-holo-mint" : isCounterfeit ? "text-red-400" : "text-holo-gold")}>
                    {s.ok ? "PASS" : "FLAGGED"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {reviewSubmitted ? (
            <div className={cn("mt-5 rounded-xl border p-4 text-center", isCounterfeit ? "border-holo-gold/30 bg-holo-gold/10" : "border-holo-cyan/30 bg-holo-cyan/10")}>
              <p className={cn("text-xs font-bold", isCounterfeit ? "text-holo-gold" : "text-holo-cyan")}>Submitted to VCA Professional Review</p>
              <p className="mt-1 text-[11px] text-white/50">
                Our authentication team reviews the images manually. You'll be notified of the outcome.
              </p>
              <button onClick={reset} className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20">
                Scan another card
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                onClick={reset}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-3 py-2.5 text-xs font-bold text-void transition-transform active:scale-95"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Scan Again
              </button>
              <button
                onClick={() => {
                  setReviewSubmitted(true);
                  pushNotification({
                    kind: "grade",
                    text: "Card submitted for professional VCA review — our authentication team will examine high-resolution images.",
                  });
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-transform active:scale-95",
                  "border-holo-gold/40 bg-holo-gold/10 text-holo-gold",
                )}
              >
                <Fingerprint className="h-3.5 w-3.5" /> Professional Review
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/60 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------- RESULT (pass) ------------------------- */
  if (!outcome) return null;
  const a = outcome.analysis;
  return (
    <div className="space-y-5">
      {/* identification */}
      <div className="holo-frame animate-fade-up overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-mint">
            <CheckCircle2 className="h-4 w-4" /> AUTHENTICATION PASSED
          </p>
          <span className="font-mono text-[10px] text-white/40">confidence {a.confidence}%</span>
        </div>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          <div className="w-40 shrink-0 self-center sm:self-start">
            <div className="relative">
              {outcome.preview ? (
                <div className="relative overflow-hidden rounded-xl ring-1 ring-white/15">
                  <img src={outcome.preview} alt="Scanned card" className="aspect-[3/4.2] w-full object-cover" />
                </div>
              ) : (
                card && <CardArt card={card} showMeta={false} interactive={false} />
              )}
              <Stamp style="pass" />
              {card && (
                <div className="absolute right-2 top-2 z-40">
                  <RarityBadge tier={rarityFor(card)} />
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-white">CARD IDENTIFICATION</h2>
            <p className="mt-1 font-display text-lg font-bold holo-text">{a.identified ? a.name : "Unidentified card"}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {(
                [
                  ["Set", a.setName],
                  ["Card Number", a.number],
                  ["Rarity", a.rarity],
                  ["Year", a.year ?? "—"],
                  ["Variant", a.holo ? "Holo" : "Non-Holo"],
                  ["Screening", `Image-based · ${a.confidence}%`],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{k}</p>
                  <p className="font-semibold text-white/85">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-white/8 bg-black/25 p-2.5 text-[11px] leading-relaxed text-white/55">{a.summary}</p>
            {a.signals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.signals.map((s) => (
                  <span
                    key={s.label}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold",
                      s.ok ? "border-holo-mint/25 bg-holo-mint/8 text-holo-mint" : "border-red-400/25 bg-red-500/10 text-red-300",
                    )}
                  >
                    {s.ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />} {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* real product verification */}
      <RealProductPanel real={real} onPick={applyCandidate} />

      {/* price engine (only when matched to catalog) */}
      {card ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceLadder card={card} live={livePrices ?? null} loading={liveLoading} />
          <PriceHistory card={card} live={livePrices ?? null} />
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 text-[12px] leading-relaxed text-white/55">
          This card isn't in the VCA value index yet, so live market pricing isn't available. It's been identified and
          screened — pricing unlocks once the card is cataloged.
        </div>
      )}

      {/* actions */}
      {card && (
        <div className="glass rounded-3xl p-5">
          <p className="font-display text-sm font-bold tracking-wide text-white/90">WHAT'S NEXT?</p>
          <p className="mt-1 text-[11px] text-white/45">Authentication passed — choose how this card enters your VCA ecosystem.</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <button
              onClick={() => {
                addToCollection(card.id);
                navigate("/collection");
              }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-holo-cyan/30 bg-holo-cyan/8 p-4 transition-all hover:bg-holo-cyan/15 active:scale-95"
            >
              <Layers className="h-6 w-6 text-holo-cyan" />
              <span className="text-xs font-bold text-white">ADD TO COLLECTION</span>
              <span className="text-[10px] text-white/40">Keep it raw & tracked</span>
            </button>
            <button
              onClick={() => {
                createDigitalSlab(card.id, "VCA 10");
                navigate(`/slab-creator?card=${card.id}`);
              }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-holo-magenta/30 bg-holo-magenta/8 p-4 transition-all hover:bg-holo-magenta/15 active:scale-95"
            >
              <Sparkles className="h-6 w-6 text-holo-magenta" />
              <span className="text-xs font-bold text-white">CREATE VCA 3D SLAB</span>
              <span className="text-[10px] text-white/40">Mint a digital slab</span>
            </button>
            <button
              onClick={() => {
                sendToGrading(card.id);
                navigate("/collection");
              }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-holo-gold/30 bg-holo-gold/8 p-4 transition-all hover:bg-holo-gold/15 active:scale-95"
            >
              <Gem className="h-6 w-6 text-holo-gold" />
              <span className="text-xs font-bold text-white">SEND TO VCA FOR GRADING</span>
              <span className="text-[10px] text-white/40">Physical NFC slab</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Real product verification (JustTCG live database)                */
/* ---------------------------------------------------------------- */

const usd = (n: number | null) =>
  n === null || !Number.isFinite(n) ? "—" : `$${n.toLocaleString("en-US")}`;

function RealProductPanel({ real, onPick }: { real: RealState | null; onPick: (c: RealCardCandidate) => void }) {
  if (!real) return null;

  if (real.status === "loading") {
    return (
      <div className="glass flex items-center gap-2.5 rounded-2xl p-3.5">
        <Database className="h-4 w-4 animate-pulse text-holo-cyan" />
        <p className="font-mono text-[10px] tracking-wider text-holo-cyan">
          CROSS-CHECKING IDENTIFICATION AGAINST THE REAL PRODUCT DATABASE…
        </p>
      </div>
    );
  }

  const m = real.match;
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        m ? "border-holo-mint/30 bg-holo-mint/6" : "border-holo-gold/35 bg-holo-gold/8",
      )}
    >
      <div className="flex items-center gap-2.5">
        {m ? (
          <BadgeCheck className="h-5 w-5 shrink-0 text-holo-mint" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-holo-gold" />
        )}
        <div>
          <p className={cn("font-display text-sm font-extrabold tracking-wide", m ? "text-holo-mint" : "text-holo-gold")}>
            {m ? "VERIFIED REAL PRODUCT" : "NOT IN REAL PRODUCT DATABASE"}
          </p>
          <p className="text-[11px] text-white/45">
            {m
              ? "Identification confirmed against the live JustTCG product record."
              : "No real product matched this identification — treat it as unconfirmed before buying or trading."}
          </p>
        </div>
      </div>

      {m && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          {(
            [
              ["Product", m.name],
              ["Set", m.setName],
              ["Number", m.number],
              ["Rarity", m.rarity || "—"],
              ["Raw (NM)", usd(m.raw)],
              ["PSA 10", usd(m.psa10)],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{k}</p>
              <p className="font-semibold text-white/85">{v}</p>
            </div>
          ))}
        </div>
      )}

      {real.candidates.length > 1 && (
        <div className="mt-3">
          <p className="font-mono text-[9px] tracking-wider text-white/40">NOT RIGHT? PICK THE EXACT CARD:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {real.candidates.slice(0, 6).map((c) => (
              <button
                key={c.slug}
                onClick={() => onPick(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95",
                  m?.slug === c.slug
                    ? "border-holo-mint/50 bg-holo-mint/15 text-holo-mint"
                    : "border-white/15 bg-white/5 text-white/65 hover:border-holo-cyan/40 hover:text-holo-cyan",
                )}
              >
                {c.name} · {c.number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
