import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  Package,
  PackageOpen,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { CATALOG } from "@/lib/data";
import { useVca } from "@/lib/store";
import type { CatalogCard, ServiceTier, ServiceTierDef, SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Grading submission wizard — users declare a card, pick a service tier and
 * mail it to the VCA grading facility. Tracked against the admin queue in
 * VCA OS.
 */

const SERVICE_TIERS: ServiceTierDef[] = [
  {
    id: "bulk",
    name: "Bulk",
    price: 14,
    turnaround: "45 business days",
    maxDeclaredValue: 200,
    blurb: "Economy grading for modern cards. Minimum 5 cards per submission.",
  },
  {
    id: "regular",
    name: "Regular",
    price: 32,
    turnaround: "20 business days",
    maxDeclaredValue: 999,
    blurb: "Our standard service. Full forensic inspection + cert & slab.",
  },
  {
    id: "express",
    name: "Express",
    price: 89,
    turnaround: "7 business days",
    maxDeclaredValue: 4999,
    blurb: "Priority line with daily status updates and photo evidence.",
  },
  {
    id: "walkthrough",
    name: "Walk-Through",
    price: 249,
    turnaround: "48 hours",
    maxDeclaredValue: 100000,
    blurb: "White-glove handling for high-value material. Grader direct line.",
  },
];

const CONDITIONS = ["Gem Mint", "Near Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"] as const;

const STATUS_STEPS: { status: SubmissionStatus; label: string; icon: typeof Package }[] = [
  { status: "SUBMITTED", label: "Submitted", icon: FileText },
  { status: "RECEIVED", label: "Received", icon: Package },
  { status: "INSPECTING", label: "Inspecting", icon: ShieldCheck },
  { status: "GRADING", label: "Grading", icon: BadgeCheck },
  { status: "GRADED", label: "Graded", icon: CheckCircle2 },
  { status: "SHIPPED", label: "Shipped", icon: Truck },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const STATUS_TINT: Record<SubmissionStatus, string> = {
  SUBMITTED: "text-holo-violet bg-holo-violet/15 border-holo-violet/30",
  RECEIVED: "text-holo-cyan bg-holo-cyan/15 border-holo-cyan/30",
  INSPECTING: "text-holo-gold bg-holo-gold/15 border-holo-gold/30",
  GRADING: "text-holo-gold bg-holo-gold/15 border-holo-gold/30",
  GRADED: "text-holo-mint bg-holo-mint/15 border-holo-mint/30",
  SHIPPED: "text-white bg-white/10 border-white/25",
};

function StepRail({ step }: { step: number }) {
  const labels = ["Card", "Condition", "Service", "Details"];
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 flex-col gap-1.5">
          <div className={cn("h-1 rounded-full", i < step ? "holo-bar" : "bg-white/10")} />
          <span className={cn("font-mono text-[8px] tracking-wider", i <= step ? "text-white/80" : "text-white/35")}>
            {i + 1} · {l.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function CardPickRow({ card, selected, onPick }: { card: CatalogCard; selected: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
        selected ? "border-holo-cyan/60 bg-holo-cyan/10 glow-cyan" : "border-white/10 bg-white/[0.03] hover:border-white/25",
      )}
    >
      <img src={card.artUrl} alt={card.name} className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/15" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[12px] font-bold text-white">{card.name}</p>
        <p className="truncate text-[10px] text-white/45">
          {card.set} · #{card.number} · {card.rarity}
        </p>
        <p className="font-mono text-[10px] text-holo-cyan">raw {usd(card.prices.raw)}</p>
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-holo-cyan" />}
    </button>
  );
}

export default function Submit() {
  const { myItems, cardById, createSubmission, submissions, currentUser, submissionPending, submissionsError } = useVca();
  const [step, setStep] = useState(0);
  const [cardId, setCardId] = useState<string | null>(new URLSearchParams(window.location.search).get('card'));
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<string>("Near Mint");
  const [declaredValue, setDeclaredValue] = useState<number>(0);
  const [tier, setTier] = useState<ServiceTier>("regular");
  const [notes, setNotes] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingName, setShippingName] = useState(currentUser.displayName);
  const [shippingAddress, setShippingAddress] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const card = cardId ? cardById(cardId) : undefined;
  const activeTier = SERVICE_TIERS.find((t) => t.id === tier) ?? SERVICE_TIERS[1];

  /* Cards the user can submit: owned collection items first, then catalog search. */
  const owned = useMemo(() => {
    const ids = new Set(myItems().map((i) => i.cardId));
    return [...ids].map(id => cardById(id)).filter((c): c is CatalogCard => Boolean(c));
  }, [myItems]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CATALOG.filter((c) => c.name.toLowerCase().includes(q) || c.set.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const mySubs = submissions.filter(s => s.userId === currentUser.id);

  const submit = async () => {
    if (submissionPending) return;
    try {
    if (!card) return;
    if (declaredValue > activeTier.maxDeclaredValue) {
      toast.error(`Declared value exceeds the ${activeTier.name} limit (${usd(activeTier.maxDeclaredValue)}).`);
      return;
    }
    const sub = await createSubmission({
      cardId: card.id,
      tier,
      declaredCondition: condition,
      declaredValue,
      notes,
      contactEmail,
      shippingName,
      shippingAddress,
    });
    setConfirmation(sub.id);
    toast.success('Grading request saved. No payment has been collected.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save the request. Please retry.'); }
  };

  const detailsValid = contactEmail.includes("@") && shippingName.trim().length > 1 && shippingAddress.trim().length >= 10 && declaredValue > 0;

  /* ------------------------------- confirmation ------------------------------- */
  if (confirmation) {
    const sub = submissions.find((s) => s.id === confirmation);
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="holo-frame animate-fade-up relative overflow-hidden rounded-3xl p-6 text-center">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/25">
              <img src="/vca-label.png" alt="VCA" className="h-full w-full object-cover" />
            </div>
            <p className="mt-4 font-mono text-[10px] font-bold tracking-[0.3em] text-holo-cyan">SUBMISSION CONFIRMED</p>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-white">{confirmation}</h1>
            <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-white/55">
              Your request is saved. No payment, shipping label or email has been generated. Do not mail your card until a VCA administrator confirms service availability and shipping instructions.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[10px] text-white/70">
              <Truck className="h-3.5 w-3.5 text-holo-cyan" /> TRACKING · {confirmation}
            </div>
            {sub?.cardArt && (
              <img src={sub.cardArt} alt={sub.cardName} className="mx-auto mt-5 h-40 rounded-xl object-cover shadow-2xl ring-1 ring-white/15" />
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setConfirmation(null);
            setStep(0);
            setCardId(null);
            setNotes("");
            setDeclaredValue(0);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 font-display text-xs font-bold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10"
        >
          <PackageOpen className="h-4 w-4" /> Submit another card
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* header */}
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/25">
              <img src="/vca-label.png" alt="VCA" className="h-full w-full object-cover" />
            </span>
            <div>
              <h1 className="font-display text-xl font-black uppercase tracking-tight text-white">Grading Submission</h1>
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/45">VCA · VERIFIED CARD AUTHORITY</p>
            </div>
          </div>
          <div className="holo-bar mt-4 h-0.5 w-full rounded-full" />
          <div className="mt-4">
            <StepRail step={step} />
          </div>
        </div>
      </div>

      {/* step 0 — pick card */}
      {step === 0 && (
        <div className="glass animate-fade-up space-y-3 rounded-3xl p-5">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Select your card</p>
          {owned.length > 0 && (
            <>
              <p className="font-mono text-[9px] tracking-wider text-white/40">FROM YOUR COLLECTION</p>
              <div className="space-y-2">
                {owned.map((c) => (
                  <CardPickRow key={c.id} card={c} selected={cardId === c.id} onPick={() => setCardId(c.id)} />
                ))}
              </div>
            </>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalog to submit a card you haven't added yet…"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-[12px] text-white placeholder:text-white/30 focus:border-holo-cyan/50 focus:outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((c) => (
                <CardPickRow key={c.id} card={c} selected={cardId === c.id} onPick={() => setCardId(c.id)} />
              ))}
            </div>
          )}
          <NavRow
            disabled={!card}
            onNext={() => {
              if (card) setDeclaredValue((v) => (v > 0 ? v : (Number.isFinite(card.prices.raw) ? Math.round(card.prices.raw) : 0)));
              setStep(1);
            }}
          />
        </div>
      )}

      {/* step 1 — condition */}
      {step === 1 && card && (
        <div className="glass animate-fade-up space-y-4 rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <img src={card.artUrl} alt={card.name} className="h-16 w-12 rounded-lg object-cover ring-1 ring-white/15" />
            <div>
              <p className="font-display text-sm font-extrabold text-white">{card.name}</p>
              <p className="text-[10px] text-white/45">
                {card.set} · #{card.number}
              </p>
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[9px] font-bold tracking-wider text-white/45">SELF-ASSESSED CONDITION</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all",
                    condition === c ? "border-holo-cyan/60 bg-holo-cyan/15 text-white glow-cyan" : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/40">
              Your self-assessment is not a grade. Only a documented professional physical inspection can support a final grading decision.
            </p>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[9px] font-bold tracking-wider text-white/45">DECLARED VALUE (USD)</label>
            <input
              type="number"
              min={0}
              value={declaredValue || ""}
              onChange={(e) => setDeclaredValue(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-[12px] text-white placeholder:text-white/30 focus:border-holo-cyan/50 focus:outline-none"
            />
            <p className="mt-2 text-[10px] text-white/40">
              Your declared value determines the service tier limit. This request does not purchase insurance.
            </p>
          </div>
          <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </div>
      )}

      {/* step 2 — service tier */}
      {step === 2 && (
        <div className="glass animate-fade-up space-y-3 rounded-3xl p-5">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Choose your service</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SERVICE_TIERS.filter(t => t.id !== 'bulk').map((t) => {
              const tooSmall = declaredValue > t.maxDeclaredValue;
              return (
                <button
                  key={t.id}
                  disabled={tooSmall}
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    tier === t.id
                      ? "border-holo-cyan/60 bg-holo-cyan/10 glow-cyan"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25",
                    tooSmall && "cursor-not-allowed opacity-35",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-sm font-extrabold uppercase tracking-wide text-white">{t.name}</span>
                    <span className="font-mono text-sm font-bold text-holo-cyan">{usd(t.price)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] tracking-wider text-holo-gold">{t.turnaround.toUpperCase()}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/50">{t.blurb}</p>
                  <p className="mt-2 font-mono text-[9px] text-white/35">MAX VALUE {usd(t.maxDeclaredValue)}</p>
                </button>
              );
            })}
          </div>
          <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {/* step 3 — details + review */}
      {step === 3 && card && (
        <div className="glass animate-fade-up space-y-4 rounded-3xl p-5">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Contact & shipping</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CONTACT EMAIL" value={contactEmail} onChange={setContactEmail} type="email" placeholder="you@email.com" />
            <Field label="SHIP-TO NAME" value={shippingName} onChange={setShippingName} placeholder="Full name" />
          </div>
          <Field
            label="RETURN ADDRESS"
            value={shippingAddress}
            onChange={setShippingAddress}
            placeholder="Street, city, state, ZIP"
          />
          <div>
            <label className="mb-1.5 block font-mono text-[9px] font-bold tracking-wider text-white/45">
              NOTES FOR THE GRADER (OPTIONAL)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything the graders should know — provenance, areas of concern…"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[12px] text-white placeholder:text-white/30 focus:border-holo-cyan/50 focus:outline-none"
            />
          </div>

          {/* order summary */}
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="mb-3 font-mono text-[9px] font-bold tracking-[0.25em] text-white/45">ORDER SUMMARY</p>
            <div className="flex items-center gap-3">
              <img src={card.artUrl} alt={card.name} className="h-14 w-10 rounded-md object-cover ring-1 ring-white/15" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[12px] font-bold text-white">{card.name}</p>
                <p className="text-[10px] text-white/45">
                  {card.set} · {condition} · declared {usd(declaredValue)}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3 font-mono text-[11px]">
              <div className="flex justify-between text-white/60">
                <span>{activeTier.name.toUpperCase()} GRADING</span>
                <span>{usd(activeTier.price)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>PAYMENT & SHIPPING</span>
                <span>NOT CONNECTED</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>TURNAROUND</span>
                <span className="text-holo-gold">{activeTier.turnaround.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-t border-white/8 pt-2 text-sm font-bold text-white">
                <span>INDICATIVE SERVICE FEE</span>
                <span className="text-holo-cyan">{usd(activeTier.price)}</span>
              </div>
            </div>
          </div>

          <NavRow
            onBack={() => setStep(2)}
            nextLabel={submissionPending ? 'Saving request…' : 'Save grading request'}
            disabled={!detailsValid || submissionPending}
            nextIcon={CreditCard}
            onNext={submit}
          />
          {!detailsValid && <p className="text-center text-[10px] text-white/40">Add a valid email and return address to continue.</p>}
        </div>
      )}

      <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">Request intake only. Fees and turnaround are indicative, subject to confirmation. No payment, insured shipping or email delivery is included yet. Bulk intake is not available.</p>
      {submissionsError && <p role="alert">{submissionsError}</p>}
      {/* my submissions */}
      {mySubs.length > 0 && (
        <div className="space-y-3">
          <p className="px-1 font-display text-sm font-extrabold uppercase tracking-wide text-white/80">My submissions</p>
          {mySubs.map((s) => {
            const stepIdx = STATUS_STEPS.findIndex((x) => x.status === s.status);
            return (
              <div key={s.id} className="glass rounded-3xl p-4">
                <div className="flex items-center gap-3">
                  {s.cardArt && <img src={s.cardArt} alt={s.cardName} className="h-14 w-10 rounded-md object-cover ring-1 ring-white/15" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-wider text-holo-cyan">{s.id}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider", STATUS_TINT[s.status])}>
                        {s.status}
                      </span>
                    </div>
                    <p className="truncate font-display text-[12px] font-bold text-white">{s.cardName}</p>
                    <p className="text-[10px] text-white/45">
                      {s.tier.toUpperCase()} · {new Date(s.createdAt).toLocaleDateString()}
                      {s.finalGrade ? ` · certified ${s.finalGrade}` : ""}
                      {s.certSerial ? ` · ${s.certSerial}` : ""}
                    </p>
                  </div>
                  {s.status === "GRADED" && s.cardId && (
                    <Link to={`/card/${s.cardId}`} className="shrink-0 rounded-full border border-holo-mint/40 bg-holo-mint/10 px-3 py-1.5 text-[10px] font-bold text-holo-mint">
                      VIEW
                    </Link>
                  )}
                </div>
                {/* tracker */}
                <div className="mt-3 flex items-center gap-1">
                  {STATUS_STEPS.map((st, i) => (
                    <div key={st.status} className="flex flex-1 flex-col items-center gap-1">
                      <div className={cn("h-1 w-full rounded-full", i <= stepIdx ? "holo-bar" : "bg-white/10")} />
                      <st.icon className={cn("h-3 w-3", i <= stepIdx ? "text-holo-cyan" : "text-white/20")} />
                    </div>
                  ))}
                </div>
                {s.events.length > 0 && (
                  <p className="mt-2 truncate font-mono text-[9px] text-white/35">
                    LATEST: {s.events[s.events.length - 1].note ?? s.events[s.events.length - 1].status}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[9px] font-bold tracking-wider text-white/45">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[12px] text-white placeholder:text-white/30 focus:border-holo-cyan/50 focus:outline-none"
      />
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  disabled,
  nextLabel = "Continue",
  nextIcon: NextIcon = ArrowRight,
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
  nextLabel?: string;
  nextIcon?: typeof ArrowRight;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-[11px] font-bold text-white/70 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className={cn(
          "ml-auto flex items-center gap-1.5 rounded-xl px-5 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-wider transition-all active:scale-95",
          disabled ? "cursor-not-allowed bg-white/10 text-white/35" : "holo-bar text-white shadow-[0_6px_24px_-6px_rgba(61,107,232,0.7)] hover:brightness-110",
        )}
      >
        {nextLabel} <NextIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
