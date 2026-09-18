"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowLeft, Bell, ChevronRight, Coins, Flame, Gift, Home, Map, Medal, Settings, Shield, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { ChildSnapshot, Mission, MissionStatus } from "@/types/domain";
import { MissionCard } from "@/components/mission-card";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { RewardStore } from "@/components/reward-store";

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) { return <div className="flex items-center gap-2.5"><div className={`grid size-9 place-items-center rounded-xl ${tone}`}>{icon}</div><div><p className="text-sm font-black text-white">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div></div>; }

export function ChildDashboard({ child, demoMode, onBack, onDemoResolved }: { child: ChildSnapshot; demoMode: boolean; onBack: () => void; onDemoResolved?: (childId: string, mission: Mission, status: Extract<MissionStatus, "waiting_approval" | "approved">) => void }) {
  const [missions, setMissions] = useState(child.missions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shieldCount, setShieldCount] = useState(child.shieldCount);
  const [shieldLoading, setShieldLoading] = useState(false);
  const [evidenceLoadingId, setEvidenceLoadingId] = useState<string | null>(null);
  const adventure = child.experienceMode === "adventure";
  const xpPercent = Math.round((child.xpInLevel / (child.xpInLevel + child.xpToNextLevel)) * 100);
  async function protectPreviousDay() {
    if (demoMode || shieldCount < 1) return;
    setShieldLoading(true);
    setNotice(null);
    try {
      const response = await fetch("/api/streaks/shield/use", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = (await response.json()) as { error?: string; shield_count?: number };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível usar o escudo.");
      setShieldCount(body.shield_count ?? Math.max(0, shieldCount - 1));
      setNotice("Dia protegido! Seu streak foi preservado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível usar o escudo.");
    } finally {
      setShieldLoading(false);
    }
  }
  async function completeMission(missionId: string) {
    setLoadingId(missionId);
    setNotice(null);
    if (demoMode) {
      const mission = missions.find((item) => item.id === missionId);
      const status = mission?.requiresApproval ? "waiting_approval" : "approved";
      setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, status: mission.requiresApproval ? "waiting_approval" : "approved" } : mission));
      if (mission) onDemoResolved?.(child.id, mission, status);
      setNotice("Missão enviada! O progresso foi atualizado.");
      setLoadingId(null);
      return;
    }
    try {
      const response = await fetch(`/api/missions/${missionId}/complete`, { method: "POST" });
      const body = (await response.json()) as { error?: string; status?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir a missão.");
      setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, status: body.status === "waiting_approval" ? "waiting_approval" : "approved" } : mission));
      setNotice(body.status === "waiting_approval" ? "Enviada para aprovação do responsável." : "Missão validada! XP e moedas liberados.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível concluir a missão.");
    } finally {
      setLoadingId(null);
    }
  }
  async function uploadEvidence(missionId: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10_000_000) {
      setNotice("Envie uma foto JPEG, PNG ou WebP de até 10 MB.");
      return;
    }
    setEvidenceLoadingId(missionId);
    setNotice(null);
    try {
      if (demoMode) {
        setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, evidenceCount: 1 } : mission));
      } else {
        const blob = await upload(file.name, file, { access: "private", handleUploadUrl: `/api/missions/${missionId}/evidence/upload` });
        const registerResponse = await fetch(`/api/missions/${missionId}/evidence/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storageUrl: blob.url, fileName: file.name }) });
        const registerBody = (await registerResponse.json()) as { error?: string };
        if (!registerResponse.ok) throw new Error(registerBody.error ?? "Não foi possível confirmar o envio da foto.");
        setMissions((current) => current.map((mission) => mission.id === missionId ? { ...mission, evidenceCount: 1 } : mission));
      }
      setNotice("Foto enviada. Agora você pode concluir a missão.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setEvidenceLoadingId(null);
    }
  }
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 sm:px-8 lg:pb-10"><header className="flex items-center justify-between py-5"><Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-slate-400"><ArrowLeft size={17} /> Trocar perfil</Button><div className="flex items-center gap-2"><button type="button" aria-label="Notificações" className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[.05] text-slate-300"><Bell size={17} /></button><button type="button" aria-label="Configurações" className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[.05] text-slate-300"><Settings size={17} /></button></div></header><div className="mb-8 flex items-center gap-3"><div className={`grid size-14 place-items-center rounded-[20px] text-3xl ${adventure ? "bg-purple-400/15" : "bg-cyan-300/15"}`}>{child.avatar}</div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{adventure ? "Modo Aventura" : "Modo Pro"}</p><h1 className="text-2xl font-black text-white">Olá, {child.displayName} <span className="text-yellow-200">✦</span></h1></div><Badge className="ml-auto hidden sm:inline-flex">Base ativa</Badge></div>{adventure ? <AdventureHero child={child} xpPercent={xpPercent} /> : <ProHero child={child} xpPercent={xpPercent} />}<section className="mt-7 grid grid-cols-3 gap-2 sm:gap-3"><Card className="p-3 sm:p-4"><Stat icon={<Zap size={16} />} value={`Nv. ${child.level}`} label="Nível" tone="bg-purple-400/15 text-purple-200" /></Card><Card className="p-3 sm:p-4"><Stat icon={<Coins size={16} />} value={`${child.coins}`} label="Moedas" tone="bg-yellow-300/15 text-yellow-200" /></Card><Card className="p-3 sm:p-4"><Stat icon={<Flame size={16} />} value={`${child.currentStreak} dias`} label="Streak" tone="bg-orange-400/15 text-orange-200" /></Card></section><Card className="mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Shield size={18} /></div><div><p className="text-sm font-black text-white">Escudos de sequência</p><p className="text-xs text-slate-400">{shieldCount > 0 ? `${shieldCount} disponível(is) para proteger um dia elegível.` : "Nenhum escudo disponível no momento."}</p></div></div><Button type="button" size="sm" variant="outline" disabled={demoMode || shieldCount < 1 || shieldLoading} onClick={protectPreviousDay}>{shieldLoading ? "Protegendo..." : "Proteger ontem"}</Button></Card><Card className="mt-3 flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-yellow-200">Cofre semanal</p><p className="mt-1 text-sm font-bold text-white">Bônus de constância</p><p className="text-xs text-slate-400">Penalidades reduzem o cofre, nunca suas moedas.</p></div><div className="text-right"><p className="text-2xl font-black text-yellow-200">{child.weeklyVaultBalance ?? 30}/{child.weeklyVaultMax ?? 30}</p><Progress value={child.weeklyVaultBalance ?? 30} className="mt-2 w-28" /></div></Card><section className="mt-9"><SectionHeading eyebrow="Agora" title="Missões de hoje" action={<button type="button" className="flex items-center gap-1 text-xs font-bold text-cyan-300">Ver todas <ChevronRight size={14} /></button>} />{notice && <p role="status" className="mb-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-xs font-semibold text-cyan-100">{notice}</p>}{missions.length === 0 ? <Card className="p-5 text-sm text-slate-400">{adventure ? "🎉 Tudo limpo por aqui!" : "Objetivos concluídos."}</Card> : <div className="grid gap-3 lg:grid-cols-3">{missions.map((mission, index) => <motion.div key={mission.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }}><MissionCard mission={mission} onComplete={() => completeMission(mission.id)} onUploadEvidence={(file) => uploadEvidence(mission.id, file)} uploadingEvidence={evidenceLoadingId === mission.id} loading={loadingId === mission.id} /></motion.div>)}</div>}</section><section className="mt-9 grid gap-4 lg:grid-cols-2"><Card className="overflow-hidden p-5"><SectionHeading eyebrow="Próximo desbloqueio" title={child.nextReward} action={<Gift className="text-yellow-200" size={20} />} /><div className="flex items-end justify-between"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-yellow-300/10 text-2xl">🎬</div><div><p className="text-sm font-bold text-white">Cofre semanal</p><p className="text-xs text-slate-500">{child.coins}/100 moedas</p></div></div><span className="text-2xl font-black text-yellow-200">{Math.round((child.coins / 100) * 100)}%</span></div><Progress value={child.coins} barClassName="from-yellow-300 to-orange-300" className="mt-4" /></Card><Card className="p-5"><SectionHeading eyebrow="Conquista recente" title={adventure ? "Exploradora da Base" : "Foco de Elite"} action={<Trophy className="text-yellow-200" size={20} />} /><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-yellow-300/20 to-purple-400/20 text-2xl">🏆</div><div><p className="text-sm font-bold text-white">Você já desbloqueou {child.achievementCount} troféus</p><p className="text-xs text-slate-500">Continue sua sequência para encontrar o próximo.</p></div></div></Card></section><RewardStore child={child} demoMode={demoMode} /><nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#090d22]/90 px-4 pt-3 backdrop-blur-xl lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0"><div className="mx-auto flex max-w-md items-center justify-around lg:max-w-none lg:justify-start lg:gap-6">{[[Home,"Home"],[Target,"Missões"],[Map,"Jornada"],[Medal,"Troféus"],[UserIcon,"Perfil"]].map(([Icon, label]) => <button type="button" key={label as string} className={`flex min-w-12 flex-col items-center gap-1 text-[10px] font-semibold ${(label as string) === "Home" ? "text-cyan-300" : "text-slate-500"}`}><Icon size={18} /><span>{label as string}</span></button>)}</div></nav></main>;
}

function UserIcon(props: React.ComponentProps<typeof Shield>) { return <Shield {...props} />; }

function AdventureHero({ child, xpPercent }: { child: ChildSnapshot; xpPercent: number }) { return <motion.section initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#35205d] via-[#191c4b] to-[#0e5369] p-5 shadow-[0_20px_70px_rgba(90,45,160,.24)] sm:p-7"><div className="absolute -right-8 -top-12 text-[150px] opacity-10">✦</div><div className="relative flex items-center gap-5"><div className="grid size-20 shrink-0 place-items-center rounded-[26px] border border-white/15 bg-white/10 text-5xl shadow-2xl">🦊</div><div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.16em] text-purple-200">Mapa da aventura</p><span className="text-xs font-bold text-white">{child.xpInLevel} / {child.xpInLevel + child.xpToNextLevel} XP</span></div><div className="h-3 overflow-hidden rounded-full bg-black/20"><div className="progress-shimmer h-full rounded-full bg-gradient-to-r from-yellow-300 via-purple-300 to-cyan-300" style={{ width: `${xpPercent}%` }} /></div><p className="mt-2 text-xs text-white/60">Mais uma missão para chegar ao nível {child.level + 1}!</p></div></div><div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4"><span className="flex items-center gap-2 text-xs font-bold text-yellow-100"><Sparkles size={15} /> 3 estrelas conquistadas hoje</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">NÍVEL {child.level}</span></div></motion.section>; }

function ProHero({ child, xpPercent }: { child: ChildSnapshot; xpPercent: number }) { return <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[30px] p-5 sm:p-7"><div className="flex items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Progressão atual</p><div className="flex items-end gap-3"><span className="text-5xl font-black tracking-[-.08em] text-white">{child.level}</span><span className="mb-2 text-sm font-bold text-slate-400">NÍVEL</span></div></div><div className="text-right"><p className="text-2xl font-black text-cyan-200">{child.totalXp.toLocaleString("pt-BR")}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">XP acumulado</p></div></div><div className="mt-6 flex items-center gap-3"><Progress value={xpPercent} barClassName="from-cyan-300 to-blue-400" className="h-2.5 flex-1" /><span className="text-xs font-bold text-slate-400">{xpPercent}%</span></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Shield size={14} className="text-cyan-300" /> Sequência protegida por <strong className="text-white">{child.bestStreak} dias</strong> de melhor marca</div></motion.section>; }
