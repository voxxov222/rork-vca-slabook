import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
export default function CameraCapture({ onCapture, onCancel }: { onCapture: (url: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [attempt, setAttempt] = useState<number>(0);
  useEffect(() => {
    let cancelled = false; let stream: MediaStream | null = null;
    setError(''); setReady(false);
    const timer = window.setTimeout(() => { if (!cancelled && video.current?.readyState !== 4) setError('Camera is taking too long. Check browser permissions, retry, or upload a photo.'); }, 15000);
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1600 } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const available = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(available.filter(d => d.kind === 'videoinput'));
      } catch (cause) {
        stream?.getTracks().forEach(t => t.stop());
        if (!cancelled) setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Camera permission denied. Allow access in your browser settings, then retry.' : cause instanceof DOMException && cause.name === 'NotReadableError' ? 'Camera is in use by another app. Close it and retry.' : 'No usable camera is available. Upload a card photo instead.');
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [deviceId, attempt]);
  const capture = (): void => {
    const v = video.current; if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) { setError('Camera has not produced a frame yet. Retry in a moment.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d'); if (!ctx) { setError('Photo capture is unavailable. Upload a photo instead.'); return; }
    ctx.drawImage(v, 0, 0); onCapture(canvas.toDataURL('image/jpeg', .9));
  };
  return <section className="glass mx-auto max-w-lg space-y-4 rounded-3xl p-5"><div className="relative overflow-hidden rounded-2xl bg-slate-950"><video ref={video} muted playsInline onLoadedData={() => { if (video.current?.videoWidth) { setReady(true); setError(''); } }} className="aspect-[3/4] w-full object-contain"/><div className="pointer-events-none absolute inset-[8%] rounded-xl border-2 border-dashed border-blue-400/70"/></div>{error && <p role="alert" className="flex gap-2 text-sm text-destructive"><CameraOff className="h-5 w-5 shrink-0"/>{error}</p>}{devices.length > 1 && <label className="block text-sm">Camera<select className="vca-input mt-2 w-full" value={deviceId} onChange={e => setDeviceId(e.target.value)}><option value="">Default rear camera</option>{devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select></label>}<div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={onCancel}>Back / upload</Button>{error ? <Button onClick={() => setAttempt(n => n + 1)}><RefreshCw className="mr-2 h-4 w-4"/>Retry</Button> : <Button disabled={!ready} onClick={capture}><Camera className="mr-2 h-4 w-4"/>{ready ? 'Capture photo' : 'Starting camera…'}</Button>}</div><p className="text-xs text-muted-foreground">Use diffuse light. Keep all four corners visible and avoid glare. The captured full frame can be cropped next.</p></section>;
}
