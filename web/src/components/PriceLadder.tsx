import { useState } from 'react';
import type { CatalogCard } from '@/lib/types';
import type { LivePrices } from '@/lib/prices';
import { Info } from 'lucide-react';
const rows = [{ key: 'raw', label: 'Raw market' }, { key: 'g8', label: 'PSA 8' }, { key: 'g9', label: 'PSA 9' }, { key: 'g10', label: 'PSA 10' }] as const;
const conditions = ['Provider market', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
function freshness(date: string): string { const timestamp = Date.parse(date); if (!Number.isFinite(timestamp)) return 'Date unavailable'; const days = Math.floor((Date.now() - timestamp) / 86400000); return days > 7 ? `${date} · STALE (${days} days old)` : date; }
export default function PriceLadder({ card, live, loading }: { card: CatalogCard; live?: LivePrices | null; loading?: boolean }) {
  const [condition, setCondition] = useState<string>('Provider market');
  return <section className="glass rounded-2xl p-5"><div className="flex justify-between"><h3 className="font-display font-bold text-foreground">Market comparisons</h3><span className="text-xs text-muted-foreground">USD</span></div>
    <p className="mt-1 text-xs text-muted-foreground">{card.variant} · {card.language}</p>
    <label className="mt-4 block text-xs font-medium">Raw condition<select aria-label="Raw condition" className="vca-input mt-2 w-full" value={condition} onChange={e => setCondition(e.target.value)}>{conditions.map(c => <option key={c}>{c}</option>)}</select></label>
    <div className="mt-2 divide-y divide-border">{rows.map(row => {
      const conditionQuote = row.key === 'raw' && condition !== 'Provider market' ? live?.rawConditions?.[condition] : undefined;
      const value = row.key === 'raw' && condition !== 'Provider market' ? conditionQuote?.price : live?.[row.key];
      const evidence = row.key === 'raw' && condition !== 'Provider market' ? conditionQuote?.evidence : live?.evidence?.[row.key];
      const available = typeof value === 'number' && Number.isFinite(value);
      return <div key={row.key} className="py-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{row.label}</span><strong className="font-mono text-primary">{available ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : loading ? 'Loading…' : 'Unavailable'}</strong></div><p className="mt-1 text-[11px] text-muted-foreground">{available && evidence ? `${evidence.source} · ${freshness(evidence.updatedAt)} · ${evidence.condition}` : 'No exact printing / condition / grade price available'}</p></div>;
    })}</div>
    <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="h-4 w-4 shrink-0"/>PSA comparisons are not VCA resale prices. Sign in for graded and condition-specific comparisons where available. Source dates may lag; these are not guaranteed sale proceeds or an appraisal.</p></section>;
}
