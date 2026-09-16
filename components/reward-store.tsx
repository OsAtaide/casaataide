"use client";

import { useEffect, useState } from "react";
import { Check, Coins, Gift, LoaderCircle, Plus, X } from "lucide-react";
import type { ChildSnapshot, Reward, RewardRedemption, RewardRedemptionStatus } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";

type RawRedemption = { id: string; reward_id: string; reward_name: string; child_id: string; child_name: string; cost: number; status: RewardRedemptionStatus; requested_at: string };
type RewardResponse = { rewards?: Array<Reward & { is_active: boolean }>; redemptions?: RawRedemption[] };

function normalizeReward(reward: Reward & { is_active: boolean }): Reward { return { id: reward.id, name: reward.name, description: reward.description, cost: reward.cost, isActive: reward.is_active }; }
function normalizeRedemption(item: RawRedemption): RewardRedemption { return { id: item.id, rewardId: item.reward_id, rewardName: item.reward_name, childId: item.child_id, childName: item.child_name, cost: item.cost, status: item.status, requestedAt: item.requested_at }; }

export function RewardStore({ child, demoMode }: { child: ChildSnapshot; demoMode: boolean }) {
  const [rewards, setRewards] = useState<Reward[]>(demoMode ? [{ id: "demo-movie", name: "Noite do filme", description: "Escolher o filme da família.", cost: 20, isActive: true }] : []);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch("/api/rewards")
      .then(async (response) => { if (!response.ok) throw new Error("Não foi possível carregar a loja."); return (await response.json()) as RewardResponse; })
      .then((body) => { if (!active) return; setRewards((body.rewards ?? []).map(normalizeReward)); setRedemptions((body.redemptions ?? []).map(normalizeRedemption)); })
      .catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Não foi possível carregar a loja."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode]);

  async function requestReward(reward: Reward) {
    setLoadingId(reward.id); setNotice(null);
    if (demoMode) { setNotice("Pedido registrado na demonstração para o responsável revisar."); setLoadingId(null); return; }
    try {
      const response = await fetch(`/api/rewards/${reward.id}/redeem`, { method: "POST" });
      const body = (await response.json()) as { error?: string; redemption?: RawRedemption };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível solicitar o resgate.");
      setNotice("Pedido enviado para aprovação do responsável.");
      if (body.redemption) setRedemptions((current) => [normalizeRedemption(body.redemption!), ...current]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível solicitar o resgate."); }
    finally { setLoadingId(null); }
  }

  const ownPending = redemptions.some((item) => item.childId === child.id && item.status === "requested");
  return <section className="mt-9"><SectionHeading eyebrow="Recompensas" title="Loja da base" action={<span className="flex items-center gap-1 text-xs text-yellow-200"><Coins size={13} /> {child.coins} moedas</span>} /><Card className="p-4 sm:p-5">{notice && <p role="status" className="mb-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-xs font-semibold text-cyan-100">{notice}</p>}{loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Carregando recompensas...</div> : rewards.length === 0 ? <p className="text-sm text-slate-400">O responsável ainda não cadastrou recompensas.</p> : <div className="grid gap-3 sm:grid-cols-2">{rewards.map((reward) => <div key={reward.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3"><div className="grid size-10 place-items-center rounded-xl bg-yellow-300/10 text-yellow-200"><Gift size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{reward.name}</p><p className="truncate text-xs text-slate-500">{reward.description || "Uma recompensa especial da família."}</p></div><Button type="button" variant="outline" size="sm" disabled={loadingId === reward.id || ownPending || child.coins < reward.cost} onClick={() => requestReward(reward)}><Coins size={13} /> {reward.cost}</Button></div>)}</div>}{ownPending && <p className="mt-3 text-xs font-semibold text-yellow-200">Você já tem um pedido aguardando aprovação.</p>}</Card></section>;
}

export function RewardManager({ demoMode }: { demoMode: boolean }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("20");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch("/api/rewards")
      .then(async (response) => { if (!response.ok) throw new Error("Não foi possível carregar as recompensas."); return (await response.json()) as RewardResponse; })
      .then((body) => { if (!active) return; setRewards((body.rewards ?? []).map(normalizeReward)); setRedemptions((body.redemptions ?? []).map(normalizeRedemption)); })
      .catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Falha ao carregar recompensas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode]);

  async function createReward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (demoMode) { setNotice("Cadastros reais ficam disponíveis com o Neon conectado."); return; }
    const response = await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, cost: Number(cost) }) });
    const body = (await response.json()) as { error?: string; reward?: Reward & { is_active: boolean } };
    if (!response.ok) { setNotice(body.error ?? "Não foi possível criar a recompensa."); return; }
    if (body.reward) setRewards((current) => [normalizeReward(body.reward!), ...current]);
    setName(""); setDescription(""); setCost("20"); setNotice("Recompensa criada.");
  }

  async function resolve(id: string, status: Extract<RewardRedemptionStatus, "approved" | "rejected">) {
    const response = await fetch(`/api/rewards/redemptions/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) { setNotice(body.error ?? "Não foi possível revisar o pedido."); return; }
    setRedemptions((current) => current.map((item) => item.id === id ? { ...item, status } : item)); setNotice(status === "approved" ? "Resgate aprovado e moedas descontadas." : "Resgate rejeitado.");
  }

  return <section className="mt-8"><SectionHeading eyebrow="Economia da base" title="Recompensas e resgates" /><div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]"><Card className="p-5"><form onSubmit={createReward} className="space-y-3"><p className="text-sm font-bold text-white">Cadastrar recompensa</p><input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Escolher o filme" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none focus:border-cyan-300/60" /><textarea maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição opcional" rows={2} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60" /><label className="block text-xs text-slate-400">Custo em moedas<input required type="number" min={1} value={cost} onChange={(event) => setCost(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none focus:border-cyan-300/60" /></label><Button type="submit" disabled={loading}><Plus size={16} /> Criar recompensa</Button>{notice && <p role="status" className="text-xs font-semibold text-cyan-100">{notice}</p>}</form>{rewards.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Cadastradas</p><div className="space-y-2">{rewards.map((reward) => <div key={reward.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-white">{reward.name}</span><span className="shrink-0 text-xs text-yellow-200">{reward.cost} moedas</span></div>)}</div></div>}</Card><Card className="divide-y divide-white/10 overflow-hidden">{loading ? <div className="flex items-center gap-2 p-5 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Carregando...</div> : redemptions.length === 0 ? <div className="p-5 text-sm text-slate-400">Nenhum pedido de resgate.</div> : redemptions.map((item) => <div key={item.id} className="flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-xl bg-yellow-300/10 text-yellow-200"><Coins size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.rewardName}</p><p className="text-xs text-slate-500">{item.childName} • {item.cost} moedas</p></div>{item.status === "requested" ? <div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label={`Aprovar resgate de ${item.rewardName}`} onClick={() => resolve(item.id, "approved")}><Check size={14} /></Button><Button type="button" variant="ghost" size="sm" aria-label={`Rejeitar resgate de ${item.rewardName}`} onClick={() => resolve(item.id, "rejected")}><X size={14} /></Button></div> : <Badge>{item.status === "approved" ? "Aprovado" : "Rejeitado"}</Badge>}</div>)}</Card></div></section>;
}
