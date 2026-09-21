import { useEffect, useRef, useState } from 'react';
import { FlipHorizontal2, RotateCcw, ZoomIn } from 'lucide-react';
import { Button } from './ui/button';
import type { CatalogCard, GradeLabel } from '@/lib/types';
export type LabelStyle = 'classic' | 'neon' | 'gold';
export type Environment = 'void' | 'studio' | 'nebula';
export interface SlabConfig { labelStyle: LabelStyle; holo: number; environment: Environment; lightTint: string; cardOffset: number; showGrade: boolean; autoSpin: boolean; simple?: boolean }
interface Props { card: CatalogCard; grade: GradeLabel | null; serial: string | null; config: SlabConfig; className?: string; frontPhoto?: string; backPhoto?: string }
/** CSS-perspective holder: no GPU/WebGL dependency; reduced motion disables auto-rotation. */
export default function HoloSlab({ card, grade, serial, config, className, frontPhoto, backPhoto }: Props) {
  const [rot, setRot] = useState<{ x: number; y: number }>({ x: -7, y: -18 });
  const [zoom, setZoom] = useState<number>(1);
  const [dragging, setDragging] = useState<boolean>(false);
  const [reduced, setReduced] = useState<boolean>(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = (): void => setReduced(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => {
    if (!config.autoSpin || reduced || dragging || config.simple) return;
    let frame = 0; let last = performance.now();
    const tick = (time: number): void => { const elapsed = Math.min(time - last, 50); last = time; if (!document.hidden) setRot(r => ({ ...r, y: r.y + elapsed * .008 })); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [config.autoSpin, config.simple, dragging, reduced]);
  const reset = (): void => { setRot({ x: -7, y: -18 }); setZoom(1); };
  const front = config.simple && ((rot.y % 360 + 360) % 360 > 90 && (rot.y % 360 + 360) % 360 < 270) ? false : true;
  return <div className={className}><div className={`slab-stage slab-stage-${config.environment} relative flex h-[480px] touch-pan-y items-center justify-center overflow-hidden rounded-3xl border sm:h-[550px]`}>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(255,255,255,.8),transparent_65%)]"/>
    <div className="absolute bottom-14 h-8 w-48 rounded-[50%] bg-slate-900/15 blur-xl"/>
    <div role="img" aria-label={`${card.name} display slab, ${grade ?? 'ungraded'}. Drag to rotate or use the flip button.`} className="slab-object relative h-[380px] w-[248px] touch-none select-none" style={{ transform: `scale(${zoom}) rotateX(${config.simple ? 0 : rot.x}deg) rotateY(${config.simple ? 0 : rot.y}deg)`, transition: dragging ? 'none' : 'transform 120ms linear', '--foil-opacity': config.holo / 100, '--light-tint': config.lightTint } as React.CSSProperties}
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!drag.current || config.simple) return; const dx = e.clientX - drag.current.x; const dy = e.clientY - drag.current.y; drag.current = { x: e.clientX, y: e.clientY }; setRot(r => ({ x: Math.max(-45, Math.min(45, r.x - dy * .35)), y: r.y + dx * .5 })); }} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}>
      {!config.simple && [0, 3, 6, 9, 12].map(depth => <div key={depth} className="slab-edge absolute inset-0 rounded-[22px]" style={{ transform: `translateZ(${-depth}px)` }}/ >)}
      <div className={`slab-face slab-front absolute inset-0 rounded-[22px] p-3 ${config.simple && !front ? 'hidden' : ''}`}>
        <div className={`slab-label slab-label-${config.labelStyle} relative flex h-[70px] gap-2 overflow-hidden rounded-lg border p-2`}>
          <img src="/vca-label.png" alt="VCA brand artwork" draggable={false} className="h-full w-6 shrink-0 object-contain"/>
          <div className="relative z-10 min-w-0 flex-1"><p className="text-[9px] font-black tracking-[.22em] text-blue-950">VERIFIED CARD AUTHORITY</p><p className="mt-1 truncate text-[11px] font-bold text-slate-900">{card.name}</p><p className="truncate text-[8px] text-slate-600">{card.set} · {card.number}</p><p className="mt-1 truncate font-mono text-[7px] text-slate-500">{serial ?? 'DISPLAY PREVIEW · NOT CERTIFIED'}</p></div>
          <div className="relative z-10 flex w-12 shrink-0 flex-col items-center justify-center border-l border-slate-300 pl-1"><strong className="text-[13px] font-black text-blue-950">{config.showGrade ? grade?.replace('VCA ', '') ?? 'RAW' : '—'}</strong><span className="text-[6px] font-bold text-slate-600">{grade ? 'VCA GRADE' : 'UNGRADED'}</span></div><div className="slab-foil pointer-events-none absolute inset-0"/>
        </div>
        <div className="slab-recess relative mt-3 flex h-[268px] items-center justify-center overflow-hidden rounded-xl p-2"><img src={frontPhoto || card.artUrl} alt={card.name} draggable={false} className="h-full max-w-full rounded-lg object-contain" style={{ transform: `translateY(${config.cardOffset}px)` }}/><div className="slab-foil pointer-events-none absolute inset-0 mix-blend-soft-light"/></div>
        <div className="slab-reflection pointer-events-none absolute inset-0 rounded-[22px]"/>
      </div>
      <div className={`slab-face slab-back absolute inset-0 flex flex-col items-center justify-center rounded-[22px] p-5 ${config.simple && front ? 'hidden' : ''}`} style={config.simple ? { transform: 'none' } : undefined}>
        {backPhoto ? <img src={backPhoto} alt="Your card back" draggable={false} className="max-h-[280px] w-full rounded-xl object-contain"/> : <><img src="/vca-label.png" alt="Original VCA brand artwork" draggable={false} className="h-52 w-28 object-contain"/><p className="mt-4 text-center text-[9px] font-bold uppercase tracking-widest text-blue-950">Original brand artwork<br/><span className="text-[8px] font-normal">Not the grade of this specimen</span></p></>}
        <p className="mt-4 max-w-full break-all text-center font-mono text-[8px] text-slate-600">{serial ?? 'DISPLAY ONLY · NO CERTIFICATE'}</p><div className="slab-reflection pointer-events-none absolute inset-0 rounded-[22px]"/>
      </div>
    </div><p className="absolute bottom-4 text-center font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">{config.simple ? 'Simple display' : 'Drag the holder to explore'} · {Math.round(zoom * 100)}%</p>
  </div><div className="mt-4 flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setRot(r => ({ x: r.x, y: r.y + 180 }))}><FlipHorizontal2 className="mr-2 h-4 w-4"/>Flip</Button><Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-2 h-4 w-4"/>Reset</Button><label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><ZoomIn className="h-4 w-4"/><input aria-label="Slab zoom" type="range" className="w-20 accent-blue-700 sm:w-32" min={65} max={125} value={zoom * 100} onChange={e => setZoom(Number(e.target.value) / 100)}/></label></div></div>;
}
