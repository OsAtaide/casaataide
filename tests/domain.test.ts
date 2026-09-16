import { describe, expect, it } from "vitest";
import { levelFromXp, progressForLevel, xpForLevel } from "@/lib/domain/levels";
import { buildMissionSchedule, calculateMissionReward, canCompleteMission, missionInputSchema, rewardForDifficulty } from "@/lib/domain/missions";
import { clampVaultBalance } from "@/lib/domain/vault";
import { canApproveRedemption, canRequestReward } from "@/lib/domain/rewards";
import { hashSecret, verifySecret } from "@/lib/auth/password";

describe("progressão", () => {
  it("calcula níveis sem espalhar regra nos componentes", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(xpForLevel(4)).toBe(900);
    expect(progressForLevel(680)).toMatchObject({ level: 3, percentage: 56 });
  });
});

describe("missões", () => {
  it("mantém recompensas padrão por dificuldade", () => {
    expect(rewardForDifficulty("easy")).toEqual({ xp: 10, coins: 3 });
    expect(rewardForDifficulty("challenge")).toEqual({ xp: 50, coins: 15 });
    expect(rewardForDifficulty("special")).toBeNull();
  });

  it("valida título e permite conclusão apenas em estados reexecutáveis", () => {
    expect(missionInputSchema.safeParse({ title: " ", description: "", difficulty: "easy", xp: 10, coins: 3 }).success).toBe(false);
    expect(canCompleteMission("pending")).toBe(true);
    expect(canCompleteMission("approved")).toBe(false);
  });

  it("gera ocorrências sem duplicar datas e reduz recompensa atrasada com arredondamento inteiro", () => {
    expect(buildMissionSchedule("2026-09-14", "weekdays")).toHaveLength(23);
    expect(buildMissionSchedule("2026-09-14", "weekly")).toHaveLength(13);
    expect(buildMissionSchedule("2026-09-14", "specific_days", { daysOfWeek: [1, 3, 5] })).toHaveLength(14);
    expect(calculateMissionReward(30, 8, true, 50)).toEqual({ xp: 15, coins: 4 });
  });
});

describe("Cofre Semanal", () => {
  it("não fica negativo nem ultrapassa o limite", () => {
    expect(clampVaultBalance(2, -5, 30)).toBe(0);
    expect(clampVaultBalance(29, 5, 30)).toBe(30);
  });
});

describe("recompensas", () => {
  it("não permite resgate acima do saldo ou aprovação repetida", () => {
    expect(canRequestReward(10, 10)).toBe(true);
    expect(canRequestReward(9, 10)).toBe(false);
    expect(canApproveRedemption("requested")).toBe(true);
    expect(canApproveRedemption("approved")).toBe(false);
  });
});

describe("credenciais", () => {
  it("armazena e valida senha/PIN com hash de uso único", () => {
    const encoded = hashSecret("1234");
    expect(encoded).toMatch(/^scrypt:v1:/);
    expect(verifySecret("1234", encoded)).toBe(true);
    expect(verifySecret("0000", encoded)).toBe(false);
  });
});
