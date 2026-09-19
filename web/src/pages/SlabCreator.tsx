import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Gem, RotateCcw, Share2, Sparkles } from "lucide-react";

import HoloSlab, { type Environment, type LabelStyle, type SlabConfig } from "@/components/HoloSlab";
import { useVca } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { GradeLabel } from "@/lib/types";

const LIGHTS = [
  { id: "#2DE2FF", name: "Ion" },
  { id: "#8B5CFF", name: "Nova" },
  { id: "#FF4FD8", name: "Pulse" },
  { id: "#FFC94A", name: "Aurum" },
];

const ENVIRONMENTS: { id: Environment; name: string }[] = [
  { id: "void", name: "Void" },
  { id: "studio", name: "Studio" },
  { id: "nebula", name: "Nebula" },
];

const LABELS: { id: LabelStyle; name: string }[] = [
  { id: "classic", name: "Classic" },
  { id: "neon", name: "Neon" },
  { id: "gold", name: "Gold" },
];

export default function SlabCreator() {
  const [params] = useSearchParams();
  const { myItems, cardById, slabDraftCardId, createDigitalSlab, addPost, pushNotification } = useVca();
  const draftFromScan = slabDraftCardId ?? params.get("card");

  const items = myItems();
  const defaultCardId = draftFromScan ?? items[0]?.cardId ?? "charizard-base";

  const [selectedCardId, setSelectedCardId] = useState<string>(defaultCardId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.find((i) => i.cardId === defaultCardId && i.grade)?.id ?? null,
  );
  const [config, setConfig] = useState<SlabConfig>({
    labelStyle: "classic",
    holo: 55,
    environment: "studio",
    lightTint: "#2DE2FF",
    cardOffset: 0,
    showGrade: true,
    autoSpin: true,
  });
  const [minted, setMinted] = useState<{ serial: string; grade: GradeLabel | null } | null>(null);
  const [shared, setShared] = useState(false);

  const card = cardById(selectedCardId);
  const selectedGradedItem = useMemo(
    () => items.find((i) => (selectedItemId ? i.id === selectedItemId : i.cardId === selectedCardId && i.grade)),
    [items, selectedItemId, selectedCardId],
  );
  const grade = selectedGradedItem?.grade ?? null;

  const set = <K extends keyof SlabConfig>(k: K, v: SlabConfig[K]) => setConfig((c) => ({ ...c, [k]: v }));

  if (!card) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <Gem className="mx-auto h-8 w-8 text-white/25" />
        <p className="mt-3 text-sm font-bold text-white/70">No cards to slab yet</p>
        <p className="mt-1 text-xs text-white/40">Scan a card first — then the VCA 3D Slab Creator is yours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-magenta">
          <Sparkles className="h-3.5 w-3.5" /> VCA 3D SLAB CREATOR
        </p>
        <h1 className="mt-2 font-display text-xl font-extrabold text-white sm:text-2xl">
          Forge your <span className="holo-text">holographic slab</span>
        </h1>
        <p className="mt-1 text-[11px] text-white/40">Drag the slab to rotate 360° · scroll or slider to zoom</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* viewer */}
        <div>
          <HoloSlab card={card} grade={grade} serial={minted?.serial ?? selectedGradedItem?.serial ?? null} config={config} />
          <div className="mt-3 flex items-center justify-between px-1">
            <button
              onClick={() => set("autoSpin", !config.autoSpin)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                config.autoSpin ? "bg-holo-cyan/20 text-holo-cyan ring-1 ring-holo-cyan/40" : "glass text-white/45",
              )}
            >
              <RotateCcw className={cn("h-3 w-3", config.autoSpin && "animate-spin-slow")} /> AUTO-SPIN {config.autoSpin ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => set("showGrade", !config.showGrade)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                config.showGrade ? "bg-holo-gold/15 text-holo-gold ring-1 ring-holo-gold/40" : "glass text-white/45",
              )}
            >
              GRADE DISPLAY {config.showGrade ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* customization */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <p className="mb-2.5 font-display text-xs font-bold tracking-wider text-white/90">SELECT CARD</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {items.map((i) => {
                const c = cardById(i.cardId);
                if (!c) return null;
                return (
                  <button
                    key={i.id}
                    onClick={() => {
                      setSelectedCardId(c.id);
                      setSelectedItemId(i.grade ? i.id : null);
                      setMinted(null);
                      setShared(false);
                    }}
                    className={cn(
                      "w-[74px] shrink-0 rounded-lg transition-all",
                      selectedCardId === c.id && (selectedItemId ? selectedItemId === i.id : true) ? "ring-2 ring-holo-cyan" : "opacity-60 hover:opacity-100",
                    )}
                  >
                    <div className="relative">
                      <img src={c.artUrl} alt={c.name} className="aspect-[3/4.2] w-full rounded-lg object-cover ring-1 ring-white/15" />
                      {i.grade && (
                        <span className="absolute right-1 top-1 rounded bg-holo-cyan/90 px-1 font-mono text-[8px] font-bold text-void">{i.grade}</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[9px] font-bold text-white/70">{c.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass space-y-4 rounded-2xl p-4">
            <div>
              <p className="mb-2 font-display text-xs font-bold tracking-wider text-white/90">LABEL STYLE</p>
              <div className="grid grid-cols-3 gap-2">
                {LABELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => set("labelStyle", l.id)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-[11px] font-bold transition-all",
                      config.labelStyle === l.id ? "border-holo-cyan/50 bg-holo-cyan/10 text-holo-cyan" : "border-white/10 bg-white/4 text-white/50 hover:text-white",
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-display text-xs font-bold tracking-wider text-white/90">HOLOGRAPHIC INTENSITY</p>
                <span className="font-mono text-[10px] text-holo-magenta">{config.holo}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={config.holo}
                onChange={(e) => set("holo", Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-holo-magenta"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-display text-xs font-bold tracking-wider text-white/90">CARD POSITION</p>
                <span className="font-mono text-[10px] text-white/40">{config.cardOffset > 0 ? `+${config.cardOffset}` : config.cardOffset}</span>
              </div>
              <input
                type="range"
                min={-14}
                max={14}
                value={config.cardOffset}
                onChange={(e) => set("cardOffset", Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-holo-cyan"
              />
            </div>

            <div>
              <p className="mb-2 font-display text-xs font-bold tracking-wider text-white/90">LIGHTING</p>
              <div className="flex gap-2">
                {LIGHTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => set("lightTint", l.id)}
                    aria-label={l.name}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      config.lightTint === l.id ? "scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-void" : "ring-1 ring-white/25",
                    )}
                    style={{ background: `radial-gradient(circle at 35% 30%, ${l.id}, ${l.id}44)` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-display text-xs font-bold tracking-wider text-white/90">DISPLAY ENVIRONMENT</p>
              <div className="grid grid-cols-3 gap-2">
                {ENVIRONMENTS.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => set("environment", e.id)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-[11px] font-bold transition-all",
                      config.environment === e.id ? "border-holo-violet/50 bg-holo-violet/10 text-holo-violet" : "border-white/10 bg-white/4 text-white/50 hover:text-white",
                    )}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* mint */}
          <div className="holo-frame rounded-2xl p-4">
            {minted ? (
              <div className="text-center">
                <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-mint">
                  <Check className="h-3.5 w-3.5" /> DIGITAL SLAB MINTED
                </p>
                <p className="mt-2 font-display text-xl font-extrabold tracking-wider text-holo-cyan">{minted.serial}</p>
                <p className="mt-1 text-[11px] text-white/45">
                  {card.name} · {card.set} · {minted.grade ?? "UNGRADED"} — permanent VCA record created
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      addPost(`VCA slab minted 💎 ${minted.serial} — ${card.name} ${minted.grade ? `(${minted.grade})` : ""} is officially in the vault.`, {
                        cardId: card.id,
                        serial: minted.serial,
                        grade: minted.grade,
                        caption: "NEW SLAB",
                      });
                      setShared(true);
                      pushNotification({ kind: "slab", text: `Slab ${minted.serial} shared on Slabook`, cardId: card.id });
                    }}
                    disabled={shared}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-95",
                      shared ? "bg-white/10 text-white/40" : "bg-gradient-to-r from-holo-cyan to-holo-violet text-void hover:brightness-110",
                    )}
                  >
                    <Share2 className="h-3.5 w-3.5" /> {shared ? "SHARED ON SLABOOK" : "SHARE ON SLABOOK"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  const record = createDigitalSlab(card.id, grade ?? "VCA 10");
                  setMinted({ serial: record.serial, grade: grade ?? "VCA 10" });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-holo-magenta via-holo-violet to-holo-cyan px-4 py-3 font-display text-sm font-extrabold tracking-wider text-void transition-all hover:brightness-110 active:scale-95"
              >
                <Gem className="h-4 w-4" /> MINT DIGITAL SLAB
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
