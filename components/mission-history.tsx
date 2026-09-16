"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, CalendarDays, CheckCircle2, Clock3, Edit2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import type { ChildSnapshot, MissionStatus } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";

type HistoryMission = { assignment_id: string; task_id: string; child_name: string; title: string; status: MissionStatus; scheduled_for: string; xp: number; coins: number; is_active: boolean };
const statusLabel: Record<MissionStatus, string> = { pending: "Pendente", completed: "Concluída", waiting_approval: "Aguardando", approved: "Aprovada", returned: "Devolvida", late: "Atrasada", missed: "Não realizada", excused: "Dispensada" };
function StatusIcon({ status }: { status: MissionStatus }) { if (["approved", "completed"].includes(status)) return <CheckCircle2 size={15} />; if (["late", "missed"].includes(status)) return <XCircle size={15} />; if (status === "waiting_approval") return <Clock3 size={15} />; return <RotateCcw size={15} />; }
function formatScheduledDate(value: string) { if (value === "Demonstração") return value; const date = new Date(value.length === 10 ? `${value}T12:00:00` : value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR"); }

export function MissionHistory({ childList, demoMode }: { childList: ChildSnapshot[]; demoMode: boolean }) {
  const [liveMissions, setLiveMissions] = useState<HistoryMission[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch("/api/missions").then(async (response) => { if (!response.ok) throw new Error("Falha ao carregar histórico."); return (await response.json()) as { missions?: HistoryMission[] }; }).then((body) => { if (active) setLiveMissions(body.missions ?? []); }).catch(() => { if (active) setLiveMissions([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode]);
  const missions = demoMode ? childList.flatMap((child) => child.missions.map((mission) => ({ assignment_id: mission.id, task_id: mission.id, child_name: child.displayName, title: mission.title, status: mission.status, scheduled_for: "Demonstração", xp: mission.xp, coins: mission.coins, is_active: true }))) : liveMissions;

  async function editMission(mission: HistoryMission) {
    const title = window.prompt("Novo nome da missão", mission.title)?.trim();
    if (!title || title === mission.title) return;
    setUpdatingId(mission.task_id); setNotice(null);
    try {
      const response = await fetch(`/api/missions/${mission.assignment_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", title }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível editar a missão.");
      setLiveMissions((current) => current.map((item) => item.task_id === mission.task_id ? { ...item, title } : item));
      setNotice("Missão atualizada. O histórico das ocorrências foi preservado.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível editar a missão."); }
    finally { setUpdatingId(null); }
  }
  async function toggleArchive(mission: HistoryMission) {
    const restore = !mission.is_active;
    if (!restore && !window.confirm(`Arquivar “${mission.title}”? O histórico será preservado.`)) return;
    setUpdatingId(mission.task_id); setNotice(null);
    try {
      const response = await fetch(`/api/missions/${mission.assignment_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: restore ? "restore" : "archive" }) });
      const body = (await response.json()) as { error?: string; isActive?: boolean };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar a missão.");
      setLiveMissions((current) => current.map((item) => item.task_id === mission.task_id ? { ...item, is_active: body.isActive ?? restore } : item));
      setNotice(restore ? "Missão restaurada para a operação." : "Missão arquivada; o histórico foi preservado.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível atualizar a missão."); }
    finally { setUpdatingId(null); }
  }
  return <section className="mt-8"><SectionHeading eyebrow="Memória da base" title="Histórico de missões" action={<span className="text-xs text-slate-500">{missions.length} registro(s)</span>} />{notice && <p role="status" className="mb-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-xs font-semibold text-cyan-100">{notice}</p>}<Card className="overflow-hidden divide-y divide-white/10">{loading ? <div className="flex items-center gap-2 p-5 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Carregando histórico...</div> : missions.length === 0 ? <div className="p-5 text-sm text-slate-400">Nenhuma missão registrada ainda.</div> : missions.slice(0, 12).map((mission) => <div key={mission.assignment_id} className="flex items-center gap-3 p-4"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${mission.status === "approved" ? "bg-emerald-300/10 text-emerald-300" : "bg-white/[.06] text-slate-400"}`}><StatusIcon status={mission.status} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{mission.title}</p><p className="truncate text-xs text-slate-500">{mission.child_name} • +{mission.xp} XP • {mission.coins} moedas</p></div><div className="flex shrink-0 items-center gap-2 text-right"><Badge className="hidden sm:inline-flex">{mission.is_active ? statusLabel[mission.status] : "Arquivada"}</Badge><span className="flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays size={12} />{formatScheduledDate(mission.scheduled_for)}</span>{!demoMode && <><button type="button" aria-label={`Editar ${mission.title}`} title="Editar missão" disabled={updatingId === mission.task_id} onClick={() => editMission(mission)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[.04] text-slate-400 transition hover:text-white disabled:opacity-50"><Edit2 size={14} /></button><button type="button" aria-label={mission.is_active ? `Arquivar ${mission.title}` : `Restaurar ${mission.title}`} title={mission.is_active ? "Arquivar missão" : "Restaurar missão"} disabled={updatingId === mission.task_id} onClick={() => toggleArchive(mission)} className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[.04] text-slate-400 transition hover:text-white disabled:opacity-50">{mission.is_active ? <Archive size={14} /> : <ArchiveRestore size={14} />}</button></>}</div></div>)}</Card></section>;
}
