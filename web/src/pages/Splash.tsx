import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** The user's hosted VCA prototype, embedded full-bleed as the splash experience. */
const PROTOTYPE_URL = "https://vca-prototype-wtnnfo.r2.composed.app/";

export default function Splash() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#04060c]">
      <iframe
        src={PROTOTYPE_URL}
        title="VCA — Verified Card Authority prototype"
        className="absolute inset-0 h-full w-full border-0"
        allow="clipboard-write"
      />

      {/* enter overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 bg-gradient-to-t from-[#04060c] via-[#04060c]/55 to-transparent pb-8 pt-20 transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0",
        )}
      >
        <Link
          to="/home"
          className="pointer-events-auto group flex items-center gap-2.5 rounded-full border border-[#3d6be8]/40 bg-[#0a1220]/80 px-7 py-3 font-mono text-[11px] font-bold tracking-[0.25em] text-[#e8394a] backdrop-blur-md transition-all hover:border-[#3d6be8] hover:bg-[#3d6be8]/15 hover:shadow-[0_0_30px_-6px_rgba(61,107,232,0.7)] active:scale-95"
        >
          <ShieldCheck className="h-4 w-4" />
          ENTER VCA SLABOOK
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/30">
          PROTOTYPE · VERIFIED CARD AUTHORITY
        </p>
      </div>
    </div>
  );
}
