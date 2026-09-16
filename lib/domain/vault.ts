export function clampVaultBalance(balance: number, delta: number, maxBalance: number) {
  return Math.max(0, Math.min(Math.max(0, maxBalance), balance + delta));
}
