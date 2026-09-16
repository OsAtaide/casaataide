"use client";

import { useEffect, useState } from "react";
import { BarChart3, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";

type ReportChild = {
  profile_id: string;
  display_name: string;
  total_missions: number;
  completed_missions: number;
  waiting_missions: number;
  overdue_missions: number;
  xp_earned: number;
  coin_delta: number;
};

type ReportResponse = { report?: { from: string; to: string; children: ReportChild[] } };

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function ReportPanel({ demoMode }: { demoMode: boolean }) {
  const [children, setChildren] = useState<ReportChild[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch("/api/reports/summary")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o relatório.");
        return (await response.json()) as ReportResponse;
      })
      .then((body) => {
        if (!active || !body.report) return;
        setPeriod({ from: body.report.from, to: body.report.to });
        setChildren(body.report.children);
      })
      .catch(() => { if (active) setChildren([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode]);

  return <section className="mt-8">
    <SectionHeading eyebrow="Leitura da base" title="Relatório operacional" action={<BarChart3 className="text-cyan-300" size={18} />} />
    <Card className="overflow-hidden p-5">
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Carregando relatório...</div> : demoMode ? <p className="text-sm text-slate-400">O relatório real aparece quando o Neon está conectado.</p> : <>
        <p className="mb-4 text-xs text-slate-500">Período: {period ? `${formatDate(period.from)} a ${formatDate(period.to)}` : "últimos 7 dias"}</p>
        {children.length === 0 ? <p className="text-sm text-slate-400">Nenhuma atividade no período.</p> : <div className="grid gap-3 sm:grid-cols-2">{children.map((child) => <div key={child.profile_id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{child.display_name}</p><Badge>{child.completed_missions}/{child.total_missions}</Badge></div><div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500"><span>{child.xp_earned} XP</span><span>{child.coin_delta} moedas</span><span>{child.overdue_missions} atrasada(s)</span></div></div>)}</div>}
      </>}
    </Card>
  </section>;
}
