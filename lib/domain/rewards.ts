export function canRequestReward(coins: number, cost: number) {
  return Number.isFinite(coins) && Number.isFinite(cost) && cost > 0 && coins >= cost;
}

export function canApproveRedemption(status: string) {
  return status === "requested";
}
