import { z } from "zod";
import type { Difficulty } from "@/types/domain";
import type { MissionRecurrence } from "@/types/domain";
import { gameConfig } from "@/lib/domain/mission-config";

export const missionInputSchema = z.object({
  title: z.string().trim().min(2, "Dê um nome para a missão."),
  description: z.string().trim().max(240, "A descrição deve ter no máximo 240 caracteres."),
  difficulty: z.enum(["easy", "normal", "important", "challenge", "special"]),
  xp: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
});

export function rewardForDifficulty(difficulty: Difficulty) {
  const rewards: Record<Exclude<Difficulty, "special">, { xp: number; coins: number }> = {
    easy: { xp: 10, coins: 3 }, normal: { xp: 20, coins: 5 }, important: { xp: 30, coins: 8 }, challenge: { xp: 50, coins: 15 },
  };
  return difficulty === "special" ? null : rewards[difficulty];
}

export function canCompleteMission(status: string) {
  return status === "pending" || status === "late" || status === "returned";
}

export function calculateMissionReward(baseXp: number, baseCoins: number, isLate: boolean, lateRewardPercentage = gameConfig.weeklyVault.lateRewardPercentage) {
  const multiplier = isLate ? Math.max(0, Math.min(100, lateRewardPercentage)) / 100 : 1;
  return { xp: Math.floor(Math.max(0, baseXp) * multiplier), coins: Math.floor(Math.max(0, baseCoins) * multiplier) };
}

export type MissionRecurrenceConfig = { daysOfWeek?: number[]; intervalDays?: number; count?: number };

export function buildMissionSchedule(startDate: string, recurrence: MissionRecurrence, config: MissionRecurrenceConfig = {}): string[] {
  const start = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return [];
  if (recurrence === "none" || recurrence === "once") return [startDate];
  if (recurrence === "monthly") {
    const count = config.count ?? gameConfig.recurrence.weeklyOccurrences;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      date.setUTCMonth(start.getUTCMonth() + index);
      return date.toISOString().slice(0, 10);
    });
  }
  const intervalDays = Math.max(1, config.intervalDays ?? (recurrence === "weekly" ? 7 : 1));
  const totalDays = recurrence === "weekly" ? gameConfig.recurrence.weeklyOccurrences * 7 : recurrence === "custom" ? intervalDays * Math.max(1, config.count ?? gameConfig.recurrence.weeklyOccurrences) : gameConfig.recurrence.dailyDays;
  const dates: string[] = [];
  for (let offset = 0; offset <= totalDays; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const weekday = date.getUTCDay();
    if (recurrence === "weekdays" && (weekday === 0 || weekday === 6)) continue;
    if (recurrence === "weekends" && weekday !== 0 && weekday !== 6) continue;
    if (recurrence === "specific_days" && !(config.daysOfWeek ?? []).includes(weekday)) continue;
    if (recurrence === "weekly" && offset % 7 !== 0) continue;
    if (recurrence === "custom" && offset % intervalDays !== 0) continue;
    dates.push(date.toISOString().slice(0, 10));
    if (recurrence === "custom" && dates.length >= (config.count ?? gameConfig.recurrence.weeklyOccurrences)) break;
  }
  return dates;
}
