import { useState } from 'react';
import { Calculator } from 'lucide-react';
import type { CatalogCard } from '@/lib/types';
import type { LivePrices } from '@/lib/prices';
import { Input } from '@/components/ui/input';
const usd = (n: number): string => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export default function GradeRoiPanel({ card, live }: { card: CatalogCard; live: LivePrices | null }) {
  const [costs, setCosts] = useState<Record<string, number>>({ purchase: 0, grading: 25, shipping: 20, fee: 13 });
  const total = costs.purchase + costs.grading + costs.shipping;
  const breakEven = total / (1 - costs.fee / 100);
  return <section className="glass space-y-5 rounded-2xl p-5"><h3 className="flex items-center gap-2 font-display font-bold"><Calculator className="h-5 w-5 text-primary"/>Grading return calculator</h3><p className="text-xs text-muted-foreground">Model your own costs for {card.name}. No assumed grade probabilities.</p>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['purchase', 'Purchase ($)'], ['grading', 'Grading ($)'], ['shipping', 'Shipping & insurance ($)'], ['fee', 'Selling fees (%)']].map(([key, label]) => <label key={key} className="space-y-2 text-xs font-medium">{label}<Input type="number" min="0" max={key === 'fee' ? 99 : 1000000} value={costs[key]} onChange={e => setCosts(c => ({ ...c, [key]: Math.max(0, Math.min(key === 'fee' ? 99 : 1000000, Number(e.target.value) || 0)) }))}/></label>)}</div>
  <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-muted-foreground">Break-even sale price, after selling fees</p><strong className="text-2xl text-primary">{usd(breakEven)}</strong><p className="mt-1 text-xs text-muted-foreground">Total cash cost {usd(total)} ÷ (1 − fee rate). Taxes and unknown expenses are not included.</p></div>
  <div className="grid grid-cols-3 gap-3">{(['g8', 'g9', 'g10'] as const).map((key, i) => { const sale = live?.[key]; const profit = typeof sale === 'number' && Number.isFinite(sale) ? sale * (1 - costs.fee / 100) - total : null; return <div key={key} className="rounded-xl border p-3"><p className="text-xs font-bold">PSA {i + 8} scenario</p><p className="mt-2 font-mono font-bold">{profit === null ? 'No quote' : usd(profit)}</p><p className="mt-1 text-[11px] text-muted-foreground">{profit === null ? 'Cannot calculate' : 'Estimated net profit / loss'}</p></div>; })}</div>
  <p className="text-xs text-muted-foreground">Decision support only. PSA grade scenarios do not predict your grade or VCA resale value. A lower grade or a price decline can produce a loss.</p></section>;
}
