import { useState } from 'react';
import { Button } from './ui/button';
import { RotateCw, Crop } from 'lucide-react';
interface CropArea { x: number; y: number; width: number; height: number }
/** Edits pixels, not just the preview, before vision upload. */
export default function PhotoEditor({ src, onChange }: { src: string; onChange: (url: string) => void }) {
  const [area, setArea] = useState<CropArea>({ x: 5, y: 5, width: 90, height: 90 });
  const [error, setError] = useState<string>('');
  const transform = async (rotate: boolean): Promise<void> => {
    try {
      const image = new Image(); image.src = src; await image.decode();
      const c = document.createElement('canvas');
      if (rotate) { c.width = image.height; c.height = image.width; const ctx = c.getContext('2d')!; ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(image, 0, 0); }
      else { const w = Math.min(area.width, 100 - area.x); const h = Math.min(area.height, 100 - area.y); c.width = Math.max(1, Math.round(image.width * w / 100)); c.height = Math.max(1, Math.round(image.height * h / 100)); c.getContext('2d')!.drawImage(image, image.width * area.x / 100, image.height * area.y / 100, c.width, c.height, 0, 0, c.width, c.height); }
      onChange(c.toDataURL('image/jpeg', .9)); setArea({ x: 5, y: 5, width: 90, height: 90 });
    } catch { setError('Could not edit this image. Try a JPEG or PNG.'); }
  };
  return <div className="space-y-4"><div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl"><img src={src} alt="Photo to scan" className="max-h-96 max-w-full"/><div className="pointer-events-none absolute border-2 border-blue-500 shadow-[0_0_0_1000px_rgba(0,0,0,.25)]" style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${Math.min(area.width, 100 - area.x)}%`, height: `${Math.min(area.height, 100 - area.y)}%` }}/></div><div className="grid grid-cols-2 gap-3">{(['x', 'y', 'width', 'height'] as const).map(key => <label className="text-xs text-muted-foreground" key={key}>{({ x: 'Left', y: 'Top', width: 'Width', height: 'Height' })[key]}<input aria-label={`Crop ${key}`} type="range" className="mt-2 w-full accent-blue-700" min={key === 'width' || key === 'height' ? 20 : 0} max={key === 'x' || key === 'y' ? 80 : 100} value={area[key]} onChange={e => setArea(a => ({ ...a, [key]: Number(e.target.value) }))}/></label>)}</div><div className="flex gap-2"><Button variant="outline" onClick={() => void transform(true)}><RotateCw className="mr-2 h-4 w-4"/>Rotate</Button><Button variant="outline" onClick={() => void transform(false)}><Crop className="mr-2 h-4 w-4"/>Apply crop</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
