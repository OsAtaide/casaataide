import { CalendarDays, Home, HeartHandshake, PencilRuler, Sparkles, Star, WashingMachine } from "lucide-react";
import type { ComponentType } from "react";

export const missionCategories = {
  organization: { label: "Organização", icon: PencilRuler, tone: "text-cyan-200" },
  study: { label: "Estudos", icon: CalendarDays, tone: "text-purple-200" },
  hygiene: { label: "Higiene", icon: WashingMachine, tone: "text-blue-200" },
  home: { label: "Casa", icon: Home, tone: "text-yellow-200" },
  collaboration: { label: "Colaboração", icon: HeartHandshake, tone: "text-emerald-200" },
  autonomy: { label: "Autonomia", icon: Star, tone: "text-orange-200" },
  special: { label: "Especial", icon: Sparkles, tone: "text-pink-200" },
  family: { label: "Família", icon: HeartHandshake, tone: "text-rose-200" },
} satisfies Record<string, { label: string; icon: ComponentType<{ size?: number; className?: string }>; tone: string }>;

export const gameConfig = {
  weeklyVault: { initialBalance: 30, maxBalance: 30, defaultRecovery: 2, lateRewardPercentage: 50 },
  recurrence: { dailyDays: 30, weeklyOccurrences: 12 },
} as const;
