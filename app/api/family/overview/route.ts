import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";
import { progressForLevel } from "@/lib/domain/levels";
import type { ChildSnapshot, Difficulty, MissionStatus, ParentOverviewMetrics } from "@/types/domain";

type ChildRow = {
  child_id: string;
  profile_id: string;
  display_name: string;
  experience_mode: "adventure" | "pro";
  avatar: string;
  total_xp: number;
  coin_balance: number;
  current_streak: number;
  best_streak: number;
  shield_count: number;
  daily_progress: number;
  achievement_count: number;
  weekly_vault_balance: number;
  weekly_vault_max: number;
};

type MissionRow = {
  assignment_id: string;
  child_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  xp: number;
  coins: number;
  status: MissionStatus;
  priority: "low" | "normal" | "high";
  requires_approval: boolean;
  due_time: string | null;
  requires_photo: boolean;
  evidence_count: number;
  recurrence: "none" | "once" | "daily" | "weekdays" | "weekends" | "weekly" | "specific_days" | "monthly" | "custom";
  penalty_amount: number;
  is_recovery: boolean;
  recovery_amount: number;
};

export async function GET() {
  const session = await getAuthorizedSession();
  if (!session) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sql) return Response.json({ children: [], demo: true });

  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      select
        c.id as child_id,
        p.id as profile_id,
        p.display_name,
        p.experience_mode,
        p.avatar,
        c.total_xp,
        c.coin_balance,
        coalesce(s.current_streak, 0)::int as current_streak,
        coalesce(s.best_streak, 0)::int as best_streak,
        coalesce(s.shield_count, 0)::int as shield_count,
        coalesce((
          select round(100.0 * count(*) filter (where ta2.status in ('completed', 'approved')) / nullif(count(*) filter (where ta2.status <> 'excused'), 0))::int
          from public.task_assignments ta2
          where ta2.child_id = c.id and ta2.family_id = public.current_family_id() and ta2.scheduled_for = current_date
        ), 0)::int as daily_progress,
        (select count(*)::int from public.child_achievements ca where ca.child_id = c.id and ca.family_id = public.current_family_id()) as achievement_count,
        coalesce((select wv.balance from public.weekly_vaults wv where wv.child_id = c.id and wv.family_id = public.current_family_id() and wv.week_start = date_trunc('week', current_date)::date), 30)::int as weekly_vault_balance,
        coalesce((select wv.max_balance from public.weekly_vaults wv where wv.child_id = c.id and wv.family_id = public.current_family_id() and wv.week_start = date_trunc('week', current_date)::date), 30)::int as weekly_vault_max
      from public.children c
      join public.profiles p on p.id = c.profile_id
      left join public.streaks s on s.child_id = c.id
      where c.family_id = public.current_family_id()
        and (${session.role === "parent"} or p.id = ${session.profileId}::uuid)
      order by p.display_name
    `,
    tx`
      select
        ta.id as assignment_id,
        ta.child_id,
        t.name as title,
        t.description,
        t.category,
        t.difficulty,
        t.xp,
        t.coins,
        ta.status,
        t.priority,
        t.requires_approval,
        t.requires_photo,
        coalesce((select count(*)::int from public.task_evidence te where te.assignment_id = ta.id), 0) as evidence_count,
        coalesce(t.recurrence->>'frequency', 'none') as recurrence,
        coalesce(ta.penalty_amount, t.penalty_amount, t.penalty_coins) as penalty_amount,
        to_char(t.due_time, 'HH24:MI') as due_time
      from public.task_assignments ta
      join public.tasks t on t.id = ta.task_id
      join public.children c on c.id = ta.child_id
      join public.profiles p on p.id = c.profile_id
      where ta.family_id = public.current_family_id()
        and (${session.role === "parent"} or p.id = ${session.profileId}::uuid)
        and ta.scheduled_for = current_date
      order by t.priority desc, t.created_at desc
    `,
    tx`
      select
        coalesce(round(100.0 * count(*) filter (where ta.scheduled_for = current_date and ta.status in ('completed', 'approved')) / nullif(count(*) filter (where ta.scheduled_for = current_date and ta.status <> 'excused'), 0))::int, 0) as daily_completion,
        coalesce(round(100.0 * count(*) filter (where ta.scheduled_for between current_date - 6 and current_date and ta.status in ('completed', 'approved')) / nullif(count(*) filter (where ta.scheduled_for between current_date - 6 and current_date and ta.status <> 'excused'), 0))::int, 0) as weekly_completion,
        count(*) filter (where ta.scheduled_for = current_date and t.is_active and ta.status not in ('approved', 'excused', 'missed'))::int as active_missions,
        count(*) filter (where ta.status = 'waiting_approval')::int as pending_approvals,
        count(*) filter (where ta.status = 'late' or (ta.status = 'pending' and ta.scheduled_for < current_date))::int as overdue_missions,
        count(*) filter (where ta.scheduled_for = current_date and t.is_active)::int as total_missions
      from public.task_assignments ta
      join public.tasks t on t.id = ta.task_id
      where ta.family_id = public.current_family_id()
    `,
  ]);

  const childRows = rows[1] as unknown as ChildRow[];
  const missionRows = rows[2] as unknown as MissionRow[];
  const summaryRow = (rows[3] as unknown as Array<{
    daily_completion: number;
    weekly_completion: number;
    active_missions: number;
    pending_approvals: number;
    overdue_missions: number;
    total_missions: number;
  }>)[0];
  const summary: ParentOverviewMetrics = {
    dailyCompletion: Number(summaryRow?.daily_completion ?? 0),
    weeklyCompletion: Number(summaryRow?.weekly_completion ?? 0),
    activeMissions: Number(summaryRow?.active_missions ?? 0),
    pendingApprovals: Number(summaryRow?.pending_approvals ?? 0),
    overdueMissions: Number(summaryRow?.overdue_missions ?? 0),
    totalMissions: Number(summaryRow?.total_missions ?? 0),
  };
  const children: ChildSnapshot[] = childRows.map((row) => {
    const progress = progressForLevel(row.total_xp);
    return {
      id: row.profile_id,
      displayName: row.display_name,
      role: "child",
      experienceMode: row.experience_mode,
      avatar: row.avatar,
      accent: row.experience_mode === "adventure" ? "purple" : "cyan",
      level: progress.level,
      totalXp: row.total_xp,
      xpInLevel: progress.current,
      xpToNextLevel: progress.required - progress.current,
      coins: row.coin_balance,
      currentStreak: row.current_streak,
      bestStreak: row.best_streak,
      shieldCount: row.shield_count,
      weeklyVaultBalance: row.weekly_vault_balance,
      weeklyVaultMax: row.weekly_vault_max,
      dailyProgress: row.daily_progress,
      achievementCount: row.achievement_count,
      nextReward: "Próxima recompensa da família",
      missions: missionRows.filter((mission) => mission.child_id === row.child_id).map((mission) => ({
        id: mission.assignment_id,
        title: mission.title,
        description: mission.description,
        category: mission.category,
        difficulty: mission.difficulty,
        xp: mission.xp,
        coins: mission.coins,
        status: mission.status,
        priority: mission.priority,
        requiresApproval: mission.requires_approval,
        requiresPhoto: mission.requires_photo,
        evidenceCount: mission.evidence_count,
        recurrence: mission.recurrence,
        penaltyCoins: mission.penalty_amount,
        isRecovery: mission.is_recovery,
        recoveryAmount: mission.recovery_amount,
        timeLabel: mission.due_time ? `Hoje • ${mission.due_time}` : undefined,
      })),
    };
  });

  return Response.json({ children, summary });
}
