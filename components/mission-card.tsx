"use client";

import { Camera, Check, ChevronRight, Clock3, Coins, LoaderCircle, LockKeyhole, Star, Upload } from "lucide-react";
import { motion } from "framer-motion";
import type { Mission } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const statusLabel: Record<Mission["status"], string> = {
  pending: "Disponível", completed: "Concluída", waiting_approval: "Aguardando",
  approved: "Validada", returned: "Refazer", late: "Atrasada", missed: "Perdida", excused: "Dispensada",
};

export function MissionCard({ mission, compact = false, onComplete, loading = false, onUploadEvidence, uploadingEvidence = false }: {
  mission: Mission;
  compact?: boolean;
  onComplete?: () => void;
  loading?: boolean;
  onUploadEvidence?: (file: File) => void;
  uploadingEvidence?: boolean;
}) {
  const done = ["completed", "approved"].includes(mission.status);
  const canComplete = ["pending", "late", "returned"].includes(mission.status);
  const evidenceRequired = mission.requiresPhoto && (mission.evidenceCount ?? 0) < 1;
  return <motion.div layout whileHover={{ y: -2 }}><Card className={compact ? "rounded-2xl" : "rounded-[24px]"}><div className="flex items-center gap-3 p-4"><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${done ? "bg-emerald-400/15 text-emerald-300" : "bg-purple-400/15 text-purple-200"}`}>{done ? <Check size={20} /> : mission.requiresApproval ? <LockKeyhole size={18} /> : <Star size={19} />}</div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{mission.title}</h3>{mission.priority === "high" && <span className="size-1.5 rounded-full bg-yellow-300" />}</div><p className="truncate text-xs text-slate-400">{mission.description}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge className="px-2 py-0.5 text-[9px]">{statusLabel[mission.status]}</Badge>{mission.timeLabel && <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock3 size={11} />{mission.timeLabel}</span>}{mission.requiresPhoto && <span className="flex items-center gap-1 text-[10px] text-slate-500"><Camera size={11} />{mission.evidenceCount ? "Foto enviada" : "Foto obrigatória"}</span>}</div></div><div className="flex shrink-0 flex-col items-end gap-1"><span className="flex items-center gap-1 text-xs font-bold text-yellow-200"><Coins size={13} />{mission.coins}</span><span className="text-[10px] font-semibold text-purple-200">+{mission.xp} XP</span>{!compact && canComplete && onUploadEvidence && evidenceRequired && <label className="mt-1 flex cursor-pointer items-center gap-1 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-2 py-2 text-[10px] font-bold text-cyan-100"><Upload size={13} /> Foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={uploadingEvidence} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUploadEvidence(file); }} /></label>}{!compact && canComplete && onComplete ? <Button variant="primary" size="sm" className="mt-1 px-3 text-[10px]" onClick={onComplete} disabled={loading || evidenceRequired}>{loading ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />}{loading ? "Enviando" : evidenceRequired ? "Envie a foto" : "Concluir"}</Button> : !compact && <Button variant="ghost" size="sm" className="mt-1 px-2 text-slate-400" aria-label={`Detalhes de ${mission.title}`}><ChevronRight size={16} /></Button>}</div></div></Card></motion.div>;
}
