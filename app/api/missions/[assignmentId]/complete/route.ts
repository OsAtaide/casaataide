import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function POST(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente um guardião pode concluir esta missão." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para concluir missões reais." }, { status: 503 });
  const { assignmentId } = await params;
  const db = requireDatabase();

  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      select t.requires_photo, exists(select 1 from public.task_evidence te where te.assignment_id = ta.id) as has_evidence
      from public.task_assignments ta join public.tasks t on t.id = ta.task_id
      where ta.id = ${assignmentId}::uuid and ta.family_id = public.current_family_id() and ta.child_id in (select c.id from public.children c where c.profile_id = ${session.profileId}::uuid)
    `,
    tx`
      with updated as (
        update public.task_assignments ta
        set status = case when t.requires_approval then 'waiting_approval' else 'approved' end,
            completed_at = now(),
            approved_at = case when t.requires_approval then null else now() end,
            reward_xp = floor(coalesce(ta.reward_xp, t.xp) * case when ta.scheduled_for < (now() at time zone f.timezone)::date or (ta.scheduled_for = (now() at time zone f.timezone)::date and t.due_time is not null and (now() at time zone f.timezone)::time > t.due_time) then t.late_reward_percentage / 100.0 else 1 end)::int,
            reward_coins = floor(coalesce(ta.reward_coins, t.coins) * case when ta.scheduled_for < (now() at time zone f.timezone)::date or (ta.scheduled_for = (now() at time zone f.timezone)::date and t.due_time is not null and (now() at time zone f.timezone)::time > t.due_time) then t.late_reward_percentage / 100.0 else 1 end)::int,
            updated_at = now()
        from public.tasks t, public.children c, public.families f
        where ta.id = ${assignmentId}::uuid
          and ta.task_id = t.id
          and ta.child_id = c.id
          and f.id = ta.family_id
          and ta.family_id = public.current_family_id()
          and c.profile_id = ${session.profileId}::uuid
          and ta.status in ('pending', 'late', 'returned')
          and (t.allow_late_completion or ta.scheduled_for > (now() at time zone f.timezone)::date or (ta.scheduled_for = (now() at time zone f.timezone)::date and (t.due_time is null or (now() at time zone f.timezone)::time <= t.due_time)))
          and (not t.requires_photo or exists(select 1 from public.task_evidence te where te.assignment_id = ta.id))
        returning ta.id, ta.child_id, ta.task_id, ta.reward_xp, ta.reward_coins, t.requires_approval, t.is_recovery, t.recovery_amount
      ),
      xp_award as (
        select u.id
        from updated u
        cross join lateral public.apply_xp_transaction(u.child_id, u.reward_xp, 'mission', u.id)
        where not u.requires_approval and u.reward_xp > 0
      ),
      coin_award as (
        select u.id
        from updated u
        cross join lateral public.apply_coin_transaction(u.child_id, u.reward_coins, 'mission', u.id)
        where not u.requires_approval and u.reward_coins > 0
      ),
      vault_award as (
        select u.id
        from updated u
        cross join lateral public.apply_vault_transaction(u.child_id, u.recovery_amount, 'recovery', u.id)
        where not u.requires_approval and u.is_recovery and u.recovery_amount > 0
      ),
      streak_update as (
        select public.refresh_child_streak(u.child_id) as refreshed
        from updated u
        where not u.requires_approval
      )
      select u.id, u.requires_approval,
        exists(select 1 from xp_award where xp_award.id = u.id)
        or exists(select 1 from coin_award where coin_award.id = u.id)
        or exists(select 1 from vault_award where vault_award.id = u.id) as awarded
      from updated u
      left join streak_update su on true
    `,
  ]);
  const evidenceCheck = (rows[1] as unknown as Array<{ requires_photo: boolean; has_evidence: boolean }>)[0];
  const result = rows[2] as unknown as Array<{ id: string; requires_approval: boolean; awarded: boolean }>;
  if (evidenceCheck?.requires_photo && !evidenceCheck.has_evidence) return Response.json({ error: "Primeiro precisamos da foto desta missão." }, { status: 422 });
  if (!result[0]) return Response.json({ error: "Missão não encontrada ou já concluída." }, { status: 404 });
  return Response.json({ ok: true, status: result[0].requires_approval ? "waiting_approval" : "approved", awarded: result[0].awarded });
}
