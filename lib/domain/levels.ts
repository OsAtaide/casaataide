export function levelFromXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) return 1;
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) return 0;
  return (level - 1) ** 2 * 100;
}

export function progressForLevel(totalXp: number) {
  const level = levelFromXp(totalXp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: totalXp - start, required: next - start, percentage: Math.min(100, Math.round(((totalXp - start) / (next - start)) * 100)) };
}
