import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";

import { fetchVcaNews } from "@/lib/news";
import { cn } from "@/lib/utils";

/**
 * VCA NEWS — CNN-style animated scrolling ticker fed by the vca-news edge
 * function (official Pokemon TCG headlines). Pauses on hover.
 */
export default function VcaNewsTicker() {
  const { data } = useQuery({
    queryKey: ["vca-news"],
    queryFn: fetchVcaNews,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
  const items = data?.items ?? [];
  if (!items.length) return null;
  const strip = [...items, ...items];

  return (
    <div className="glass relative flex items-stretch overflow-hidden rounded-full" aria-label="VCA News ticker">
      {/* channel chip */}
      <div className="relative z-10 flex shrink-0 items-center gap-1.5 bg-gradient-to-r from-holo-magenta via-holo-cyan to-holo-violet px-3.5 py-2">
        <Radio className="h-3 w-3 animate-pulse text-void" />
        <span className="font-display text-[10px] font-extrabold tracking-[0.18em] text-void">VCA NEWS</span>
      </div>

      {/* marquee */}
      <div className="group relative min-w-0 flex-1 overflow-hidden">
        <div className="animate-ticker flex w-max items-center gap-7 py-2 pl-5 group-hover:[animation-play-state:paused]">
          {strip.map((n, i) => (
            <a
              key={`${n.id}-${i}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 whitespace-nowrap text-[11px] text-white/70 transition-colors hover:text-holo-cyan"
            >
              <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-holo-cyan">{n.source}</span>
              <span className="font-semibold">{n.title}</span>
              <span className="text-[7px] text-holo-magenta">◆</span>
            </a>
          ))}
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-panel to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-panel to-transparent" />
      </div>

      {/* live indicator */}
      <span
        className={cn(
          "relative z-10 flex shrink-0 items-center gap-1.5 border-l border-white/8 px-3 font-mono text-[8px] font-bold tracking-[0.2em]",
          data?.live ? "text-holo-mint" : "text-holo-gold",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", data?.live ? "animate-pulse bg-holo-mint" : "bg-holo-gold")} />
        {data?.live ? "LIVE" : "WIRE"}
      </span>
    </div>
  );
}
