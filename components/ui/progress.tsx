import { cn } from "@/lib/utils";

export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return <div className={cn("h-2 overflow-hidden rounded-full bg-white/10", className)}><div className={cn("progress-shimmer h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-300 transition-all duration-700", barClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
