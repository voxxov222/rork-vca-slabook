import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-extrabold holo-text sm:text-8xl">404</p>
      <p className="mt-3 font-display text-sm font-bold tracking-widest text-white/70">CARD NOT FOUND</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-white/40">
        This page isn't in the binder. Head back to the vault and keep collecting.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/home" className="rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-5 py-2.5 text-xs font-bold text-void transition-transform hover:scale-105">
          Back Home
        </Link>
        <Link to="/scanner" className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/10">
          <ScanLine className="h-3.5 w-3.5" /> Scan a card
        </Link>
      </div>
    </div>
  );
}
