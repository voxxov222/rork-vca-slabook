import { useState } from 'react';
import { CATALOG } from '@/lib/data';
import PhotoInspection from './PhotoInspection';
/** Manual photo workspace. Certification is available only through authorized submission intake. */
export default function CardInspectionLab() {
  const [id, setId] = useState<string>(CATALOG[0].id);
  const card = CATALOG.find(c => c.id === id) ?? CATALOG[0];
  return <div className="space-y-4"><label className="block text-sm">Reference card<select className="vca-input ml-3" value={id} onChange={e => setId(e.target.value)}>{CATALOG.map(c => <option value={c.id} key={c.id}>{c.name} · {c.set} · {c.number}</option>)}</select></label><PhotoInspection key={id} card={card}/></div>;
}
