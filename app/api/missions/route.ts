import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";
import { rewardForDifficulty } from "@/lib/domain/missions";
import { buildMissionSchedule } from "@/lib/domain/missions";

const createMissionSchema = z.object({
  title: z.string().trim().min(2, "Dê um nome para a missão.").max(120),
  description: z.string().trim().max(240).default(""),
  category: z.string().trim().min(2).max(50).default("Base"),
  difficulty: z.enum(["easy", "normal", "important", "challenge", "special"]),
  xp: z.number().int().nonnegative().optional(),
  coins: z.number().int().nonnegative().optional(),
  penaltyCoins: z.number().int().nonnegative().default(0),
  requiresApproval: z.boolean().default(false),
  requiresPhoto: z.boolean().default(false),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  scheduledFor: z.string().date().optional(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.").optional(),
  recurrence: z.enum(["none", "once", "daily", "weekdays", "weekends", "weekly", "specific_days", "monthly", "custom"]).default("none"),
  recurrenceConfig: z.object({ daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(), intervalDays: z.number().int().min(1).max(31).optional(), count: z.number().int().min(1).max(365).optional() }).default({}),
  allowLateCompletion: z.boolean().default(true),
  lateRewardPercentage: z.number().int().min(0).max(100).default(50),
  isRequired: z.boolean().default(false),
  isRecovery: z.boolean().default(false),
  recoveryAmount: z.number().int().nonnegative().max(30).default(0),
  relatedAssignmentId: z.string().uuid().optional(),
  childProfileIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um guardião.").max(10),
}).superRefine((input, context) => {
  if (new Set(input.childProfileIds).size !== input.childProfileIds.length) {
    context.addIssue({ code: "custom", path: ["childProfileIds"], message: "Não repita o mesmo guardião." });
  }
  const defaults = rewardForDifficulty(input.difficulty);
  if (input.difficulty === "special" && (input.xp === undefined || input.coins === undefined)) {
    context.addIssue({ code: "custom", path: ["xp"], message: "Missões especiais precisam informar XP e moedas." });
  }
  if (input.xp === undefined && defaults) input.xp = defaults.xp;
  if (input.coins === undefined && defaults) input.coins = defaults.coins;
  if (input.isRecovery && input.recoveryAmount <= 0) context.addIssue({ code: "custom", path: ["recoveryAmount"], message: "Missões de recuperação precisam informar pontos do Cofre." });
});

type MissionRow = {
  assignment_id: string;
  task_id: string;
  child_id: string;
  child_profile_id: string;
  child_name: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  xp: number;
  coins: number;
  penalty_coins: number;
  status: string;
  priority: string;
  requires_approval: boolean;
  requires_photo: boolean;
  evidence_count: number;
  recurrence: "none" | "once" | "daily" | "weekdays" | "weekends" | "weekly" | "specific_days" | "monthly" | "custom";
  due_time: string | null;
  allow_late_completion: boolean;
  late_reward_percentage: number;
  is_recovery: boolean;
  recovery_amount: number;
  scheduled_for: string;
  completed_at: string | null;
  approved_at: string | null;
  is_active: boolean;
};

export async function GET() {
  const session = await getAuthorizedSession();
  if (!session) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sql) return Response.json({ missions: [], demo: true });

  const db = requireDatabase();
  const rows = session.role === "child"
    ? await db.transaction((tx) => [
        tx`select set_config('app.family_id', ${session.familyId}, true)`,
        tx`
          select
            ta.id as assignment_id, t.id as task_id, c.id as child_id,
            p.id as child_profile_id, p.display_name as child_name,
            t.name as title, t.description, t.category, t.difficulty, t.xp,
            t.coins, t.penalty_coins, ta.status, t.priority, t.requires_approval,
            t.requires_photo, coalesce((select count(*)::int from public.task_evidence te where te.assignment_id = ta.id), 0) as evidence_count,
            coalesce(t.recurrence->>'frequency', 'none') as recurrence, to_char(t.due_time, 'HH24:MI') as due_time,
            t.allow_late_completion, t.late_reward_percentage, t.is_recovery, t.recovery_amount,
            ta.scheduled_for, ta.completed_at, ta.approved_at, t.is_active
          from public.task_assignments ta
          join public.tasks t on t.id = ta.task_id
          join public.children c on c.id = ta.child_id
          join public.profiles p on p.id = c.profile_id
          where ta.family_id = public.current_family_id()
            and c.profile_id = ${session.profileId}::uuid
            and t.is_active
          order by ta.scheduled_for desc, t.priority desc, t.created_at desc
        `,
      ])
    : await db.transaction((tx) => [
        tx`select set_config('app.family_id', ${session.familyId}, true)`,
        tx`
          select
            ta.id as assignment_id, t.id as task_id, c.id as child_id,
            p.id as child_profile_id, p.display_name as child_name,
            t.name as title, t.description, t.category, t.difficulty, t.xp,
            t.coins, t.penalty_coins, ta.status, t.priority, t.requires_approval,
            t.requires_photo, coalesce((select count(*)::int from public.task_evidence te where te.assignment_id = ta.id), 0) as evidence_count,
            coalesce(t.recurrence->>'frequency', 'none') as recurrence, to_char(t.due_time, 'HH24:MI') as due_time,
            t.allow_late_completion, t.late_reward_percentage, t.is_recovery, t.recovery_amount,
            ta.scheduled_for, ta.completed_at, ta.approved_at, t.is_active
          from public.task_assignments ta
          join public.tasks t on t.id = ta.task_id
          join public.children c on c.id = ta.child_id
          join public.profiles p on p.id = c.profile_id
          where ta.family_id = public.current_family_id()
          order by ta.scheduled_for desc, t.priority desc, t.created_at desc
        `,
      ]);
  return Response.json({ missions: rows[1] as unknown as MissionRow[] });
}

export async function POST(request: Request) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode criar missões." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para criar missões reais." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }
  const parsed = createMissionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const input = parsed.data;
  const db = requireDatabase();
  const scheduledFor = input.scheduledFor ?? new Date().toISOString().slice(0, 10);
  const scheduledDates = buildMissionSchedule(scheduledFor, input.recurrence, input.recurrenceConfig);
  if (!scheduledDates.length) return Response.json({ error: "A data inicial da missão é inválida." }, { status: 400 });

  const eligibleRows = await db`
    select count(*)::int as count
    from public.children c
    join public.profiles p on p.id = c.profile_id
    where c.family_id = ${session.familyId}::uuid
      and p.id = any(${input.childProfileIds}::uuid[])
  `;
  if (Number((eligibleRows[0] as { count: number } | undefined)?.count ?? 0) !== input.childProfileIds.length) {
    return Response.json({ error: "Um ou mais guardiões não pertencem à família atual." }, { status: 400 });
  }

  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with inserted_task as (
        insert into public.tasks
          (family_id, created_by, name, description, category, difficulty, xp, coins, penalty_coins, penalty_amount, recurrence, recurrence_type, due_time, start_date, end_date, is_required, allow_late_completion, late_reward_percentage, is_recovery, recovery_amount, related_assignment_id, requires_approval, requires_photo, priority)
        values
          (public.current_family_id(), ${session.profileId}, ${input.title}, ${input.description}, ${input.category}, ${input.difficulty}, ${input.xp ?? 0}, ${input.coins ?? 0}, ${input.penaltyCoins}, ${input.penaltyCoins}, ${JSON.stringify({ frequency: input.recurrence, ...input.recurrenceConfig })}::jsonb, ${input.recurrence === "none" ? "once" : input.recurrence}, ${input.dueTime ?? null}::time, ${scheduledDates[0]}::date, ${scheduledDates[scheduledDates.length - 1]}::date, ${input.isRequired}, ${input.allowLateCompletion}, ${input.lateRewardPercentage}, ${input.isRecovery}, ${input.recoveryAmount}, ${input.relatedAssignmentId ?? null}::uuid, ${input.requiresApproval}, ${input.requiresPhoto}, ${input.priority})
        returning id
      )
      insert into public.task_assignments (family_id, task_id, child_id, scheduled_for)
      select public.current_family_id(), inserted_task.id, c.id, schedule_date::date
      from inserted_task
      join public.children c on c.family_id = public.current_family_id()
      join public.profiles p on p.id = c.profile_id
      cross join unnest(${scheduledDates}::date[]) as schedule_date
      where p.id = any(${input.childProfileIds}::uuid[])
      returning id as assignment_id, task_id, child_id, scheduled_for
    `,
  ]);
  const assignments = rows[1] as unknown as Array<{ assignment_id: string; task_id: string; child_id: string; scheduled_for: string }>;
  return Response.json({ ok: true, taskId: assignments[0]?.task_id, assignments }, { status: 201 });
}
