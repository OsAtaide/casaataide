import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function POST(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode aprovar missões." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para aprovar missões reais." }, { status: 503 });
  const { assignmentId } = await params;
  const db = requireDatabase();

  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with updated as (
        update public.task_assignments ta
        set status = 'approved', approved_at = now(), approved_by = ${session.profileId}::uuid
        from public.tasks t
        where ta.id = ${assignmentId}::uuid
          and ta.task_id = t.id
          and ta.family_id = public.current_family_id()
          and ta.status = 'waiting_approval'
        returning ta.id, ta.child_id, ta.task_id, coalesce(ta.reward_xp, t.xp) as reward_xp, coalesce(ta.reward_coins, t.coins) as reward_coins, t.is_recovery, t.recovery_amount
      ),
      xp_award as (
        select u.id
        from updated u
        cross join lateral public.apply_xp_transaction(u.child_id, u.reward_xp, 'mission', u.id)
        where u.reward_xp > 0
      ),
      coin_award as (
        select u.id
        from updated u
        cross join lateral public.apply_coin_transaction(u.child_id, u.reward_coins, 'mission', u.id)
        where u.reward_coins > 0
      ),
      vault_award as (
        select u.id
        from updated u
        cross join lateral public.apply_vault_transaction(u.child_id, u.recovery_amount, 'recovery', u.id)
        where u.is_recovery and u.recovery_amount > 0
      ),
      streak_update as (
        select public.refresh_child_streak(u.child_id) as refreshed
        from updated u
      )
      select u.id
      from updated u
      left join xp_award xa on xa.id = u.id
      left join coin_award ca on ca.id = u.id
      left join vault_award va on va.id = u.id
      left join streak_update su on true
    `,
  ]);
  const result = rows[1] as unknown as Array<{ id: string }>;
  if (!result[0]) return Response.json({ error: "Missão não está aguardando aprovação." }, { status: 404 });
  return Response.json({ ok: true, status: "approved", awarded: true });
}
