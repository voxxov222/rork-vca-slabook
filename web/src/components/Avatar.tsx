import { cn } from "@/lib/utils";

interface AvatarProps {
  displayName: string;
  hue: number;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
} as const;

export default function Avatar({ displayName, hue, size = "md", online, className }: AvatarProps) {
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-display font-bold tracking-wider text-void ring-1 ring-white/20",
          sizes[size],
        )}
        style={{
          background: `conic-gradient(from 200deg, hsl(${hue} 90% 60%), hsl(${(hue + 70) % 360} 90% 62%), hsl(${(hue + 160) % 360} 90% 58%), hsl(${hue} 90% 60%))`,
        }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-void",
            online ? "bg-holo-mint shadow-[0_0_8px_rgba(74,255,196,0.9)]" : "bg-slate-500",
          )}
        />
      )}
    </div>
  );
}
