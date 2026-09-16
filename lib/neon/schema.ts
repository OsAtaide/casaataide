import { boolean, date, integer, jsonb, pgTable, text, time, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/Fortaleza"),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  experienceMode: text("experience_mode"),
  avatar: text("avatar").notNull(),
});

export const children = pgTable("children", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  familyId: uuid("family_id").notNull().references(() => families.id),
  totalXp: integer("total_xp").notNull(),
  coinBalance: integer("coin_balance").notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  xp: integer("xp").notNull(),
  coins: integer("coins").notNull(),
  penaltyAmount: integer("penalty_amount").notNull().default(0),
  recurrence: jsonb("recurrence"),
  recurrenceType: text("recurrence_type").notNull().default("once"),
  dueTime: time("due_time"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  requiresApproval: boolean("requires_approval").notNull(),
  requiresPhoto: boolean("requires_photo").notNull(),
  allowLateCompletion: boolean("allow_late_completion").notNull(),
  lateRewardPercentage: integer("late_reward_percentage").notNull(),
  isRecovery: boolean("is_recovery").notNull(),
  recoveryAmount: integer("recovery_amount").notNull(),
  relatedAssignmentId: uuid("related_assignment_id"),
  isActive: boolean("is_active").notNull(),
});

export const taskAssignments = pgTable("task_assignments", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  scheduledFor: date("scheduled_for").notNull(),
  status: text("status").notNull(),
  rewardXp: integer("reward_xp"),
  rewardCoins: integer("reward_coins"),
  penaltyAmount: integer("penalty_amount"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (table) => ({ occurrence: uniqueIndex("uq_task_assignment_occurrence").on(table.taskId, table.childId, table.scheduledFor) }));

export const taskEvidence = pgTable("task_evidence", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  assignmentId: uuid("assignment_id").notNull().references(() => taskAssignments.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const xpTransactions = pgTable("xp_transactions", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  amount: integer("amount").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
});

export const coinTransactions = pgTable("coin_transactions", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
});

export const weeklyVaults = pgTable("weekly_vaults", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  weekStart: date("week_start").notNull(),
  balance: integer("balance").notNull(),
  maxBalance: integer("max_balance").notNull(),
}, (table) => ({ childWeek: uniqueIndex("uq_weekly_vault_child_week").on(table.childId, table.weekStart) }));

export const vaultTransactions = pgTable("vault_transactions", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id),
  weeklyVaultId: uuid("weekly_vault_id").notNull().references(() => weeklyVaults.id),
  childId: uuid("child_id").notNull().references(() => children.id),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
});
