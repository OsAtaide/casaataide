import { Sparkles } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-purple-400 to-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(24,214,237,.24)]"><Sparkles size={20} fill="currentColor" /></div>{!compact && <div><p className="text-sm font-black tracking-[.28em] text-white">CASAQUEST</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Guardiões da Base</p></div>}</div>;
}
