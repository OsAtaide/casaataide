"use client";

import { type FormEvent, useState } from "react";
import { CalendarDays, Check, LoaderCircle, Plus, Target, UserRound } from "lucide-react";
import type { ChildSnapshot, Difficulty, Mission, MissionRecurrence } from "@/types/domain";
import { rewardForDifficulty } from "@/lib/domain/missions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const difficultyLabels: Record<Exclude<Difficulty, "special">, string> = {
  easy: "Fácil • 10 XP / 3 moedas", normal: "Normal • 20 XP / 5 moedas",
  important: "Importante • 30 XP / 8 moedas", challenge: "Desafio • 50 XP / 15 moedas",
};

type CreatedMission = Mission & { childProfileIds: string[] };

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function MissionComposer({ childList, demoMode, onCreated }: { childList: ChildSnapshot[]; demoMode: boolean; onCreated?: (mission?: CreatedMission) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Exclude<Difficulty, "special">>("normal");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [scheduledFor, setScheduledFor] = useState(localDateKey);
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState<MissionRecurrence>("none");
  const [penaltyCoins, setPenaltyCoins] = useState("0");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState(() => childList.map((child) => child.id));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleChild(childId: string) {
    setSelectedChildIds((current) => current.includes(childId) ? current.filter((id) => id !== childId) : [...current, childId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChildIds.length) { setNotice({ type: "error", text: "Selecione pelo menos um guardião." }); return; }
    setLoading(true); setNotice(null);
    const recurrenceConfig = recurrence === "specific_days" ? { daysOfWeek: [1, 2, 3, 4, 5] } : recurrence === "custom" ? { intervalDays: 7, count: 12 } : {};
    const payload = { title, description, category: "Base", difficulty, priority, scheduledFor, dueTime: dueTime || undefined, recurrence, recurrenceConfig, requiresApproval, requiresPhoto, penaltyCoins: Number(penaltyCoins) || 0, childProfileIds: selectedChildIds };
    try {
      if (!demoMode) {
        const response = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const body = (await response.json()) as { error?: string; assignments?: unknown[] };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível criar a missão.");
        setNotice({ type: "success", text: `Missão criada para ${body.assignments?.length ?? selectedChildIds.length} ocorrência(s).` });
        await onCreated?.();
      } else {
        const reward = rewardForDifficulty(difficulty);
        await onCreated?.({ id: `demo-${Date.now()}`, title, description, category: "Base", difficulty, xp: reward?.xp ?? 0, coins: reward?.coins ?? 0, status: "pending", priority, requiresApproval, requiresPhoto, penaltyCoins: Number(penaltyCoins) || 0, recurrence, timeLabel: dueTime ? `${scheduledFor === localDateKey() ? "Hoje" : scheduledFor} • ${dueTime}` : scheduledFor, childProfileIds: selectedChildIds });
        setNotice({ type: "success", text: `Missão criada na demonstração para ${selectedChildIds.length} guardião(ões).` });
      }
      setTitle(""); setDescription(""); setDueTime(""); setRecurrence("none"); setPenaltyCoins("0"); setRequiresPhoto(false);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível criar a missão." });
    } finally { setLoading(false); }
  }

  return <section className="mt-8">
    <div className="mb-4 flex items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-cyan-300"><Target size={14} /> Nova missão</p><h2 className="mt-2 text-xl font-black text-white">Delegar uma missão</h2></div><span className="text-xs text-slate-500">Base familiar</span></div>
    <Card className="p-5 sm:p-6"><form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]"><label><span className="mb-2 block text-xs font-bold text-slate-300">Nome da missão</span><input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Organizar a mochila" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /></label><label><span className="mb-2 block text-xs font-bold text-slate-300">Dificuldade</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Exclude<Difficulty, "special">)} className="h-11 w-full rounded-2xl border border-white/10 bg-[#121833] px-4 text-sm text-white outline-none focus:border-cyan-300/60">{Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="mb-2 block text-xs font-bold text-slate-300">Data da missão</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input required type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-300/60" /></span></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-2 block text-xs font-bold text-slate-300">Horário <span className="font-normal text-slate-500">(opcional)</span></span><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none focus:border-cyan-300/60" /></label><label><span className="mb-2 block text-xs font-bold text-slate-300">Repetição</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as MissionRecurrence)} className="h-11 w-full rounded-2xl border border-white/10 bg-[#121833] px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/60"><option value="none">Uma vez</option><option value="daily">Todos os dias • 30 dias</option><option value="weekdays">Dias úteis • 30 dias</option><option value="weekends">Fins de semana • 30 dias</option><option value="weekly">Toda semana • 12 vezes</option><option value="monthly">Todo mês • 12 vezes</option><option value="specific_days">Dias específicos (padrão semanal)</option><option value="custom">Intervalo personalizado (padrão semanal)</option></select></label><label><span className="mb-2 block text-xs font-bold text-slate-300">Penalidade <span className="font-normal text-slate-500">(Cofre)</span></span><input type="number" min={0} max={1000} value={penaltyCoins} onChange={(event) => setPenaltyCoins(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none focus:border-cyan-300/60" /></label></div>
      <label><span className="mb-2 block text-xs font-bold text-slate-300">Orientação <span className="font-normal text-slate-500">(opcional)</span></span><textarea maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explique o que precisa ser feito." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /></label>
      <div><span className="mb-2 block text-xs font-bold text-slate-300">Enviar para</span><div className="grid gap-2 sm:grid-cols-2">{childList.map((child) => <button type="button" key={child.id} onClick={() => toggleChild(child.id)} aria-pressed={selectedChildIds.includes(child.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedChildIds.includes(child.id) ? "border-cyan-300/50 bg-cyan-300/[.08]" : "border-white/10 bg-white/[.03]"}`}><span className="grid size-9 place-items-center rounded-xl bg-white/[.06] text-xl">{child.avatar}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{child.displayName}</span><span className="flex items-center gap-1 text-[10px] text-slate-500"><UserRound size={11} /> {child.experienceMode === "adventure" ? "Modo Aventura" : "Modo Pro"}</span></span>{selectedChildIds.includes(child.id) && <Check className="text-cyan-300" size={17} />}</button>)}</div></div>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><label className="flex items-center gap-3 text-xs text-slate-300"><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} className="size-4 accent-cyan-300" /> Exigir aprovação ao concluir</label><label className="flex items-center gap-3 text-xs text-slate-300"><input type="checkbox" checked={requiresPhoto} onChange={(event) => setRequiresPhoto(event.target.checked)} className="size-4 accent-cyan-300" /> Exigir foto da tarefa</label><label className="flex items-center gap-2 text-xs text-slate-400">Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as "low" | "normal" | "high")} className="rounded-xl border border-white/10 bg-[#121833] px-2 py-2 text-xs text-white"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></label></div>
      {notice && <p role="status" className={`rounded-2xl border p-3 text-xs font-semibold ${notice.type === "success" ? "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200" : "border-rose-300/20 bg-rose-300/[.08] text-rose-200"}`}>{notice.text}</p>}<Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading || !childList.length}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{loading ? "Criando missão..." : "Criar missão"}</Button>
    </form></Card>
  </section>;
}
