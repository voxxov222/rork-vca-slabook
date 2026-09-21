import { render } from 'vitest-browser-react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CameraCapture from '@/components/CameraCapture';
import PriceLadder from '@/components/PriceLadder';
import HoloSlab from '@/components/HoloSlab';
import { CATALOG } from '@/lib/data';
import { AuthProvider } from '@/lib/auth';
import { VcaProvider } from '@/lib/store';
import AdminOS from '@/pages/AdminOS';
import '@/index.css';
describe('collector trust and controls', () => {
  it('shows useful permission errors rather than a fake viewfinder result', async () => {
    const original = navigator.mediaDevices.getUserMedia;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) });
    try { const screen = await render(<CameraCapture onCapture={() => undefined} onCancel={() => undefined}/>); await expect.element(screen.getByRole('alert')).toHaveTextContent('Camera permission denied'); await expect.element(screen.getByRole('button', { name: 'Retry' })).toBeVisible(); await screen.unmount(); }
    finally { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: original }); }
  });
  it('stops a camera stream that arrives after cancellation', async () => {
    const original = navigator.mediaDevices.getUserMedia; const stop = vi.fn(); let complete: (stream: MediaStream) => void = () => undefined;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise<MediaStream>(resolve => { complete = resolve; }) });
    try { const screen = await render(<CameraCapture onCapture={() => undefined} onCancel={() => undefined}/>); await screen.unmount(); complete({ getTracks: () => [{ stop }] } as unknown as MediaStream); await expect.poll(() => stop.mock.calls.length).toBe(1); }
    finally { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: original }); }
  });
  it('labels partial prices independently and never substitutes a VCA price', async () => {
    const screen = await render(<PriceLadder card={CATALOG[0]} live={{ raw: 100, g8: NaN, g9: NaN, g10: NaN, history: [], rawHistory: [], updatedAt: '2026-09-20', source: 'Test', evidence: { raw: { source: 'Test market', updatedAt: '2026-09-20', printing: 'holofoil', condition: 'Market aggregate', currency: 'USD' } } }}/>);
    await expect.element(screen.getByText('$100.00')).toBeVisible(); expect(screen.getByText('Unavailable', { exact: true }).all().length).toBe(3); await expect.element(screen.getByText(/PSA comparisons are not VCA resale prices/)).toBeVisible(); await screen.unmount();
  });
  it('keeps ungraded slabs ungraded and provides accessible flip/reset', async () => {
    const screen = await render(<HoloSlab card={CATALOG[0]} grade={null} serial={null} config={{ labelStyle: 'classic', holo: 35, environment: 'studio', lightTint: '#244cb4', cardOffset: 0, showGrade: true, autoSpin: false }}/>);
    await expect.element(screen.getByText('UNGRADED', { exact: true })).toBeVisible(); await screen.getByRole('button', { name: 'Flip' }).click(); await screen.getByRole('button', { name: 'Reset' }).click(); await expect.element(screen.getByRole('slider', { name: 'Slab zoom' })).toBeVisible(); await screen.unmount();
  });
  it('does not unlock administration with the old localStorage password', async () => {
    localStorage.setItem('vca-os-session', 'two2@email.com'); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const screen = await render(<QueryClientProvider client={client}><AuthProvider><VcaProvider><MemoryRouter><AdminOS/></MemoryRouter></VcaProvider></AuthProvider></QueryClientProvider>);
    await expect.element(screen.getByRole('heading', { name: 'Administrator access' })).toBeVisible(); await expect.element(screen.getByText(/old demo password no longer grants access/)).toBeVisible(); await screen.unmount(); localStorage.removeItem('vca-os-session'); client.clear();
  });
});
