import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, Search, ScanLine, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CameraCapture from '@/components/CameraCapture';
import PhotoEditor from '@/components/PhotoEditor';
import PriceLadder from '@/components/PriceLadder';
import GradeRoiPanel from '@/components/GradeRoiPanel';
import { analyzeCardImage, downscaleForUpload, fileToDataUrl, type ScanAnalysis } from '@/lib/vision';
import { CATALOG } from '@/lib/data';
import { collectorNumber, normalizeIdentity } from '@/lib/identity';
import { searchRealCards, useLivePrices } from '@/lib/prices';
import { useVca } from '@/lib/store';
import type { CatalogCard } from '@/lib/types';

type Phase = 'start' | 'camera' | 'photo' | 'review' | 'confirmed';
export default function Scanner() {
  const navigate = useNavigate();
  const { saveCard, recordScan, addToCollection, setSlabDraftCardId, scanHistory } = useVca();
  const [phase, setPhase] = useState<Phase>('start');
  const [photo, setPhoto] = useState<string>('');
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [name, setCardName] = useState<string>('');
  const [setName, setSetName] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [candidates, setCandidates] = useState<CatalogCard[]>([]);
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const [confirmed, setConfirmed] = useState<CatalogCard | undefined>(undefined);
  const [printing, setPrinting] = useState<string>('Unconfirmed');
  const [language, setLanguage] = useState<string>('English');
  const [error, setError] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const run = useRef<number>(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { run.current += 1; controller.current?.abort(); }, []);
  const cancel = (): void => { run.current += 1; controller.current?.abort(); setStage(''); };
  const search = async (n: string, s: string, num: string, signal: AbortSignal): Promise<CatalogCard[]> => {
    const remote = await searchRealCards(s, n, signal, num);
    return remote.map(c => c.card).filter((c): c is CatalogCard => Boolean(c)).sort((a, b) => Number(collectorNumber(b.number) === collectorNumber(num)) - Number(collectorNumber(a.number) === collectorNumber(num)));
  };
  const pipeline = useMutation({ mutationFn: async (manual: boolean) => {
    cancel(); const token = run.current; const ctrl = new AbortController(); controller.current = ctrl; setError(''); setSelected(null); setConfirmed(undefined);
    let n = name; let s = setName; let num = number;
    try {
      if (!manual) {
        setStage('Preparing your photo…'); const prepared = await downscaleForUpload(photo);
        if (run.current !== token) return;
        setPhoto(prepared); setStage('Reading card name, set and collector number…');
        const result = await analyzeCardImage(prepared, ctrl.signal);
        if (run.current !== token) return;
        setAnalysis(result); setPhase('review');
        n = result.identified ? result.name : ''; s = result.identified ? result.setName : ''; num = result.identified ? result.number : '';
        setCardName(n); setSetName(s); setNumber(num); setPrinting('Unconfirmed');
        if (!result.identified) { setError('The photo could not be identified. Retake in better light or enter the card details below. No authenticity decision was made.'); return; }
      }
      if (!n.trim()) throw new Error('Enter a card name to search.');
      setStage('Searching the card catalog…');
      let cards: CatalogCard[] = [];
      try { cards = await search(n, s, num, ctrl.signal); }
      catch (cause) {
        if (ctrl.signal.aborted) throw cause;
        cards = CATALOG.filter(c => normalizeIdentity(c.name).includes(normalizeIdentity(n)));
        if (run.current === token) setError('Live catalog search is unavailable. These are bundled references only. Retry the search for more printings.');
      }
      if (run.current !== token) return;
      setCandidates(cards); setPhase('review');
      if (!cards.length) setError('No catalog results. Check the spelling or clear the set field to broaden the search.');
    } catch (cause) {
      if (run.current !== token) return;
      setError(cause instanceof TypeError ? 'Could not reach the identification service. Check your connection, reload and retry, or search by name below.' : cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'AbortError' ? cause.message : 'The request timed out. Retry or search by name.');
    } finally { if (run.current === token) setStage(''); }
  } });
  const upload = useMutation({ mutationFn: async (file: File) => {
    cancel(); if (!file.type.startsWith('image/') || file.size > 25000000) throw new Error('Choose an image smaller than 25 MB.');
    const url = await downscaleForUpload(await fileToDataUrl(file)); setPhoto(url); setPhase('photo'); setError(''); setConfirmed(undefined);
  }, onError: () => setError('Could not read this photo. Try a JPEG, PNG or WebP smaller than 25 MB.') });
  const confirm = useMutation({ mutationFn: async () => {
    if (!selected || printing === 'Unconfirmed') throw new Error('Choose the printing before confirming.');
    const card: CatalogCard = { ...selected, id: `${selected.tcgdexId || selected.tcgCardId || selected.id}:${normalizeIdentity(language)}:${normalizeIdentity(printing)}`, variant: printing, language, prices: { raw: NaN, g10: NaN, g9: NaN, g8: NaN }, history: [] };
    await saveCard(card, photo || undefined);
    await recordScan({ cardName: card.name, setName: card.set, number: card.number, rarity: card.rarity, verdict: 'suspect', confidence: analysis?.confidence ?? 0, matchedCardId: card.id, verifiedProduct: true });
    setConfirmed(card); setSlabDraftCardId(card.id); setPhase('confirmed');
  }, onError: e => setError(e.message) });
  const prices = useLivePrices(confirmed);
  const choose = (card: CatalogCard): void => { setSelected(card); setPrinting('Unconfirmed'); };
  const reset = (): void => { cancel(); setPhase('start'); setPhoto(''); setAnalysis(null); setConfirmed(undefined); setSelected(null); setCandidates([]); setCardName(''); setSetName(''); setNumber(''); setError(''); };
  if (phase === 'camera') return <CameraCapture onCancel={() => setPhase(photo ? 'photo' : 'start')} onCapture={url => { setPhoto(url); setPhase('photo'); }}/ >;
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow flex items-center gap-2"><ScanLine className="h-4 w-4"/>COLLECTOR TOOLS / 01</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Know exactly what you hold.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Identify a card, confirm its printing, then explore prices. Your photo is never an authenticity certificate.</p></div>{phase !== 'start' && <Button variant="outline" onClick={reset}>Start over</Button>}</header>
  <div className="flex gap-2 text-xs">{['Capture', 'Confirm match', 'Explore value'].map((label, i) => <div key={label} className={`flex flex-1 items-center gap-2 border-b-2 pb-3 ${i === (phase === 'confirmed' ? 2 : phase === 'review' ? 1 : 0) ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}><span className="font-mono">0{i + 1}</span>{label}</div>)}</div>
  {error && <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0"/><span>{error}</span></div>}
  {stage ? <section className="glass space-y-5 rounded-3xl p-10 text-center"><ScanLine className="mx-auto h-12 w-12 animate-pulse text-primary"/><p role="status" className="font-semibold">{stage}</p><p className="text-sm text-muted-foreground">Waiting for the service response. No result has been assumed.</p><Button variant="outline" onClick={cancel}>Cancel request</Button></section> : <>
  {(phase === 'start' || phase === 'photo') && <div className="grid gap-5 md:grid-cols-2"><section className="glass space-y-5 rounded-3xl p-6">{photo ? <PhotoEditor src={photo} onChange={setPhoto}/> : <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center"><ScanLine className="h-14 w-14 text-primary"/><p className="mt-5 font-display text-lg font-bold">One card. All four corners.</p><p className="mt-2 text-xs text-muted-foreground">A sharp, well-lit photo gives the best match.</p></div>}<div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setPhase('camera')}><Camera className="mr-2 h-4 w-4"/>{photo ? 'Retake' : 'Open camera'}</Button><label className="vca-upload"><ImagePlus className="h-4 w-4"/>Upload photo<input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }}/></label></div>{photo && <Button className="w-full" disabled={upload.isPending} onClick={() => pipeline.mutate(false)}>Identify this photo<ArrowRight className="ml-2 h-4 w-4"/></Button>}</section><section className="glass flex flex-col justify-between rounded-3xl p-6"><div><p className="eyebrow">A BETTER MATCH STARTS HERE</p><h2 className="mt-4 font-display text-2xl font-bold">The details make the difference.</h2><ol className="mt-6 space-y-5 text-sm text-muted-foreground"><li><strong className="text-foreground">01 / Name & set</strong><p className="mt-1">The same Pokémon appears in many different sets.</p></li><li><strong className="text-foreground">02 / Collector number</strong><p className="mt-1">Look at the bottom edge. Include letter prefixes like TG or GG.</p></li><li><strong className="text-foreground">03 / Printing & language</strong><p className="mt-1">Holo, reverse holo and first editions have different markets.</p></li></ol></div><Button variant="outline" className="mt-8" onClick={() => setPhase('review')}><Search className="mr-2 h-4 w-4"/>Search without a photo</Button></section></div>}
  {phase === 'review' && <section className="glass space-y-5 rounded-3xl p-5 sm:p-7"><h2 className="font-display text-2xl font-bold">Confirm the exact printing.</h2>{analysis && <p className="rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-muted-foreground">AI identification suggestion: {analysis.name} · {analysis.confidence}% identification confidence.<br/>{analysis.summary}</p>}<form className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto]" onSubmit={e => { e.preventDefault(); pipeline.mutate(true); }}><label className="text-xs">Card name<Input value={name} onChange={e => setCardName(e.target.value)} placeholder="Charizard"/></label><label className="text-xs">Set (optional)<Input value={setName} onChange={e => setSetName(e.target.value)} placeholder="Base"/></label><label className="text-xs">Number<Input value={number} onChange={e => setNumber(e.target.value)} placeholder="4/102"/></label><Button className="self-end" type="submit">Search</Button></form><p className="text-xs text-muted-foreground">Catalog artwork is an English reference. Verify printed text and all details against your own card; no candidate is automatically confirmed.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{candidates.map(c => <button key={c.id} onClick={() => choose(c)} className={`rounded-2xl border-2 p-3 text-left transition hover:-translate-y-1 ${selected?.id === c.id ? 'border-primary bg-blue-50' : 'border-border bg-white'}`}><img src={c.artUrl} alt={`${c.name}, ${c.set}, ${c.number}`} className="mx-auto h-40 max-w-full object-contain"/><p className="mt-3 text-sm font-bold">{c.name}</p><p className="mt-1 text-xs text-muted-foreground">{c.set} · #{c.number}</p></button>)}</div>{selected && <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="font-semibold">{selected.name} · {selected.set} · {selected.number}</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Printing<select className="vca-input mt-2 w-full" value={printing} onChange={e => setPrinting(e.target.value)}>{['Unconfirmed', 'Normal / Non-holo', 'Holofoil', 'Reverse Holofoil', '1st Edition Holo', '1st Edition Normal', 'Shadowless', 'Other / Unknown'].map(p => <option key={p}>{p}</option>)}</select></label><label className="text-sm">Card language<select className="vca-input mt-2 w-full" value={language} onChange={e => setLanguage(e.target.value)}>{['English', 'Japanese', 'French', 'German', 'Spanish', 'Other'].map(l => <option key={l}>{l}</option>)}</select></label></div>{language !== 'English' && <p className="text-xs text-destructive">Non-English product identity is not supported by this catalog. Do not confirm an English reference as a different-language product.</p>}<Button disabled={printing === 'Unconfirmed' || language !== 'English' || confirm.isPending} onClick={() => confirm.mutate()}><Check className="mr-2 h-4 w-4"/>{confirm.isPending ? 'Saving…' : 'Confirm this card'}</Button></div>}</section>}
  {phase === 'confirmed' && confirmed && <><section className="glass flex flex-col gap-6 rounded-3xl p-6 sm:flex-row"><img src={photo || confirmed.artUrl} alt={confirmed.name} className="h-56 max-w-full rounded-xl object-contain"/><div className="flex-1"><p className="eyebrow">IDENTITY CONFIRMED BY YOU · UNGRADED</p><h2 className="mt-2 font-display text-3xl font-bold">{confirmed.name}</h2><p className="mt-2 text-sm text-muted-foreground">{confirmed.set} · #{confirmed.number}<br/>{confirmed.variant} · {confirmed.language}</p><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => void addToCollection(confirmed.id).catch(e => toast.error(e.message))}>Add to collection</Button><Button variant="outline" onClick={() => navigate(`/card/${encodeURIComponent(confirmed.id)}`)}>Inspect & value</Button><Button variant="outline" onClick={() => navigate(`/slab-creator?card=${encodeURIComponent(confirmed.id)}`)}>Slab Studio</Button><Button variant="outline" onClick={() => navigate(`/submit?card=${encodeURIComponent(confirmed.id)}`)}>Request grading</Button></div></div></section><div className="grid gap-5 lg:grid-cols-2"><PriceLadder card={confirmed} live={prices.data} loading={prices.isFetching}/><GradeRoiPanel card={confirmed} live={prices.data ?? null}/></div></>}
  </>}
  {phase === 'start' && scanHistory.length > 0 && <section className="glass rounded-2xl p-5"><h2 className="font-bold">Recent confirmed scans</h2><div className="mt-3 divide-y">{scanHistory.slice(0, 5).map(s => <button key={s.id} className="flex min-h-14 w-full items-center justify-between py-3 text-left text-sm" disabled={!s.matchedCardId} onClick={() => navigate(`/card/${encodeURIComponent(s.matchedCardId!)}`)}><span>{s.cardName}<small className="ml-2 text-muted-foreground">{s.setName} · {s.number}</small></span><ArrowRight className="h-4 w-4"/></button>)}</div></section>}
  </div>;
}
