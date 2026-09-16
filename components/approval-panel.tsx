"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquare, ShieldAlert, Undo2 } from "lucide-react";
import type { ChildSnapshot, Mission } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { EvidenceViewer } from "@/components/evidence-viewer";

type ApprovalItem = { childId: string; childName: string; mission: Mission };
function pendingApprovalItems(childList: ChildSnapshot[]) { return childList.flatMap((child) => child.missions.filter((mission) => mission.status === "waiting_approval").map((mission) => ({ childId: child.id, childName: child.displayName, mission }))); }

export function ApprovalPanel({ childList, demoMode, onDemoApproved, onResolved }: { childList: ChildSnapshot[]; demoMode: boolean; onDemoApproved?: (childId: string, mission: Mission, status: "approved") => void; onResolved?: () => void | Promise<void> }) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const items = pendingApprovalItems(childList).filter(({ mission }) => !dismissedIds.includes(mission.id));

  async function review(item: ApprovalItem, action: "approve" | "return" | "excuse") {
    const reason = reasons[item.mission.id]?.trim() ?? "";
    if (action !== "approve" && !reason) { setNotice("Escreva o motivo antes de devolver ou justificar."); return; }
    setLoadingId(item.mission.id); setNotice(null);
    try {
      if (demoMode) {
        if (action === "approve") onDemoApproved?.(item.childId, item.mission, "approved");
      } else {
        const endpoint = action === "approve" ? "approve" : action === "return" ? "return" : "excuse";
        const response = await fetch(`/api/missions/${item.mission.id}/${endpoint}`, { method: "POST", headers: action === "approve" ? undefined : { "Content-Type": "application/json" }, body: action === "approve" ? undefined : JSON.stringify({ reason }) });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível revisar a missão.");
      }
      setDismissedIds((current) => current.includes(item.mission.id) ? current : [...current, item.mission.id]);
      await onResolved?.();
      setNotice(action === "approve" ? "Missão aprovada. XP e moedas foram liberados." : action === "return" ? "Missão devolvida para correção." : "Missão justificada sem penalidade.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível revisar a missão."); }
    finally { setLoadingId(null); }
  }

  return <section className="mt-8"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-yellow-200"><ShieldAlert size={14} /> Revisão segura</p><h2 className="mt-2 text-xl font-black text-white">Aprovar missões concluídas</h2></div><span className="text-xs font-bold text-slate-500">{items.length} pendente{items.length === 1 ? "" : "s"}</span></div>{notice && <p role="status" className="mb-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-xs font-semibold text-cyan-100">{notice}</p>}<Card className="divide-y divide-white/10 overflow-hidden">{items.length === 0 ? <div className="p-5 text-sm text-slate-400">Tudo revisado por enquanto.</div> : items.map((item) => <div key={item.mission.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-yellow-300/10 text-yellow-200"><CheckCircle2 size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.mission.title}</p><p className="text-xs text-slate-500">{item.childName} • {item.mission.category} • +{item.mission.xp} XP • {item.mission.coins} moedas</p>{item.mission.requiresPhoto && <><p className="mt-1 text-[10px] text-cyan-200">{item.mission.evidenceCount ? "Evidência fotográfica disponível." : "Sem evidência fotográfica."}</p>{item.mission.evidenceCount ? <EvidenceViewer assignmentId={item.mission.id} /> : null}</>}<label className="mt-2 flex items-center gap-2 text-[10px] text-slate-500"><MessageSquare size={12} /><span className="sr-only">Motivo</span><input value={reasons[item.mission.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.mission.id]: event.target.value }))} placeholder="Motivo para devolver ou justificar" className="h-8 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-2 text-xs text-white outline-none focus:border-cyan-300/50" /></label></div><div className="flex shrink-0 gap-2"><button type="button" aria-label={`Aprovar ${item.mission.title}`} onClick={() => review(item, "approve")} disabled={loadingId === item.mission.id} className="grid size-10 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300 transition hover:bg-emerald-300/20 disabled:opacity-50">{loadingId === item.mission.id ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}</button><button type="button" aria-label={`Devolver ${item.mission.title}`} onClick={() => review(item, "return")} disabled={loadingId === item.mission.id} className="grid size-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200 transition hover:bg-amber-300/20 disabled:opacity-50"><Undo2 size={16} /></button><button type="button" aria-label={`Justificar ${item.mission.title}`} onClick={() => review(item, "excuse")} disabled={loadingId === item.mission.id} className="grid size-10 place-items-center rounded-xl bg-slate-300/10 text-slate-200 transition hover:bg-slate-300/20 disabled:opacity-50"><ShieldAlert size={16} /></button></div></div>)}</Card></section>;
}
