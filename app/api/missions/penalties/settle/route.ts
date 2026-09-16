import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function POST() {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode processar penalidades." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para processar penalidades reais." }, { status: 503 });
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      update public.task_assignments ta
      set status = case
        when ((now() at time zone f.timezone)::date > ta.scheduled_for and t.allow_late_completion) then 'late'
        when ((now() at time zone f.timezone)::date = ta.scheduled_for and t.due_time is not null and (now() at time zone f.timezone)::time > t.due_time and t.allow_late_completion) then 'late'
        else 'missed'
      end,
      updated_at = now()
      from public.tasks t join public.families f on f.id = ta.family_id
      where ta.task_id = t.id and ta.family_id = public.current_family_id() and t.is_active and ta.status in ('pending', 'late')
        and (((now() at time zone f.timezone)::date > ta.scheduled_for) or ((now() at time zone f.timezone)::date = ta.scheduled_for and t.due_time is not null and (now() at time zone f.timezone)::time > t.due_time))
      returning ta.id, ta.child_id, coalesce(ta.penalty_amount, t.penalty_amount, t.penalty_coins)::int as penalty_amount
    `,
    tx`
      with candidates as (
        select ta.id, ta.child_id, coalesce(ta.penalty_amount, t.penalty_amount, t.penalty_coins)::int as penalty_amount
        from public.task_assignments ta join public.tasks t on t.id = ta.task_id
        where ta.family_id = public.current_family_id() and ta.status = 'missed' and coalesce(ta.penalty_amount, t.penalty_amount, t.penalty_coins) > 0
          and not exists (select 1 from public.vault_transactions vt where vt.child_id = ta.child_id and vt.source_type = 'mission_penalty' and vt.source_id = ta.id)
      ), charged as (
        select c.id, coalesce(v.amount, 0)::int as amount
        from candidates c
        left join lateral public.apply_vault_transaction(c.child_id, -c.penalty_amount, 'mission_penalty', c.id) v on true
      )
      select count(*)::int as processed, coalesce(sum(amount), 0)::int as vault_delta from charged
    `,
  ]);
  const statusChanges = rows[1] as unknown as Array<{ id: string }>;
  const summary = (rows[2] as unknown as Array<{ processed: number; vault_delta: number }>)[0];
  return Response.json({ ok: true, changed: statusChanges.length, penalized: Number(summary?.processed ?? 0), vaultDelta: Number(summary?.vault_delta ?? 0) });
}
