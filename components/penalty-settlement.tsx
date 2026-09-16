"use client";

import { useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PenaltySettlement({ demoMode, onSettled }: { demoMode: boolean; onSettled?: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function settle() {
    if (demoMode) { setNotice("No modo demonstração, o processamento real fica desativado."); return; }
    setLoading(true); setNotice(null);
    try {
      const response = await fetch("/api/missions/penalties/settle", { method: "POST" });
      const body = (await response.json()) as { error?: string; penalized?: number };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível processar as penalidades.");
      await onSettled?.();
      setNotice(body.penalized ? `${body.penalized} missão(ões) processada(s) no Cofre Semanal.` : "Nenhuma penalidade nova para processar.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível processar as penalidades.");
    } finally { setLoading(false); }
  }
  return <Card className="mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><AlertTriangle size={18} /></div><div><p className="text-sm font-black text-white">Fechamento de missões vencidas</p><p className="mt-1 text-xs text-slate-400">Marca atrasos e perdas com segurança; a penalidade reduz apenas o Cofre Semanal.</p>{notice && <p role="status" className="mt-2 text-xs font-semibold text-cyan-100">{notice}</p>}</div></div><Button type="button" variant="outline" size="sm" onClick={settle} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={15} /> : null}{loading ? "Processando..." : "Processar agora"}</Button></Card>;
}
