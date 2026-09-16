"use client";

import { useState } from "react";
import { HeartPulse, LoaderCircle } from "lucide-react";
import type { ChildSnapshot } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function RecoveryMissionComposer({ childList, demoMode, onCreated }: { childList: ChildSnapshot[]; demoMode: boolean; onCreated?: () => void | Promise<void> }) {
  const [childId, setChildId] = useState(childList[0]?.id ?? "");
  const [amount, setAmount] = useState("2");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function submit() {
    if (!childId || Number(amount) < 1) { setNotice("Escolha um guardião e informe ao menos 1 ponto."); return; }
    setLoading(true); setNotice(null);
    try {
      if (!demoMode) {
        const response = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Missão de recuperação", description: "Recupere pontos do Cofre com uma tarefa extra.", category: "special", difficulty: "easy", xp: 0, coins: 0, penaltyCoins: 0, recoveryAmount: Number(amount), isRecovery: true, requiresApproval: true, requiresPhoto: false, priority: "normal", recurrence: "none", childProfileIds: [childId] }) });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível criar a recuperação.");
        await onCreated?.();
      }
      setNotice(demoMode ? "A recuperação está disponível apenas no banco real." : `Missão de recuperação criada: +${amount} no Cofre após aprovação.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar a recuperação."); }
    finally { setLoading(false); }
  }
  return <Card className="mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between"><div className="flex min-w-0 gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><HeartPulse size={18} /></div><div><p className="text-sm font-black text-white">Criar missão de recuperação</p><p className="mt-1 text-xs text-slate-400">Uma tarefa aprovada recupera pontos sem ultrapassar o limite semanal.</p><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Guardião da recuperação" value={childId} onChange={(event) => setChildId(event.target.value)} className="h-9 rounded-xl border border-white/10 bg-[#121833] px-2 text-xs text-white">{childList.map((child) => <option key={child.id} value={child.id}>{child.displayName}</option>)}</select><input aria-label="Pontos para recuperar" type="number" min={1} max={30} value={amount} onChange={(event) => setAmount(event.target.value)} className="h-9 w-20 rounded-xl border border-white/10 bg-white/[.05] px-2 text-xs text-white" /></div>{notice && <p role="status" className="mt-2 text-xs font-semibold text-cyan-100">{notice}</p>}</div></div><Button type="button" variant="outline" size="sm" onClick={submit} disabled={loading || !childList.length}>{loading ? <LoaderCircle className="animate-spin" size={15} /> : null}{loading ? "Criando..." : "Criar recuperação"}</Button></Card>;
}
