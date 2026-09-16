export type ExperienceMode = "adventure" | "pro";
export type ProfileRole = "parent" | "child";
export type Difficulty = "easy" | "normal" | "important" | "challenge" | "special";
export type MissionRecurrence = "none" | "once" | "daily" | "weekdays" | "weekends" | "weekly" | "specific_days" | "monthly" | "custom";
export type MissionStatus = "pending" | "completed" | "waiting_approval" | "approved" | "returned" | "late" | "missed" | "excused";

export type Profile = {
  id: string;
  displayName: string;
  role: ProfileRole;
  age?: number;
  experienceMode?: ExperienceMode;
  avatar: string;
  accent: "purple" | "cyan" | "yellow";
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  xp: number;
  coins: number;
  status: MissionStatus;
  priority: "low" | "normal" | "high";
  timeLabel?: string;
  requiresApproval?: boolean;
  requiresPhoto?: boolean;
  evidenceCount?: number;
  penaltyCoins?: number;
  recurrence?: MissionRecurrence;
  isRecovery?: boolean;
  recoveryAmount?: number;
};

export type ChildSnapshot = Profile & {
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpToNextLevel: number;
  coins: number;
  currentStreak: number;
  bestStreak: number;
  shieldCount: number;
  weeklyVaultBalance?: number;
  weeklyVaultMax?: number;
  dailyProgress: number;
  missions: Mission[];
  achievementCount: number;
  nextReward: string;
};

export type ParentOverviewMetrics = {
  dailyCompletion: number;
  weeklyCompletion: number;
  activeMissions: number;
  pendingApprovals: number;
  overdueMissions: number;
  totalMissions: number;
};

export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isActive: boolean;
};

export type RewardRedemptionStatus = "requested" | "approved" | "rejected";

export type RewardRedemption = {
  id: string;
  rewardId: string;
  rewardName: string;
  childId: string;
  childName: string;
  cost: number;
  status: RewardRedemptionStatus;
  requestedAt: string;
};
