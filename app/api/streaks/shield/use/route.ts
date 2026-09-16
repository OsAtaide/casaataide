import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function POST(request: Request) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente um perfil infantil pode usar um escudo." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para usar escudos reais." }, { status: 503 });
  let requestedDate: string | null = null;
  try {
    const body = await request.json() as { date?: unknown };
    if (typeof body.date === "string") requestedDate = body.date;
  } catch {
    requestedDate = null;
  }
  const shieldDate = requestedDate ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with target as (
        select s.child_id, s.shield_count, f.streak_threshold,
          count(ta.id)::int as total_missions,
          count(ta.id) filter (where ta.status in ('completed', 'approved'))::int as completed_missions
        from public.streaks s
        join public.families f on f.id = s.family_id
        join public.children c on c.id = s.child_id
        left join public.task_assignments ta on ta.child_id = c.id and ta.family_id = public.current_family_id() and ta.scheduled_for = ${shieldDate}::date
        where s.child_id = c.id and c.profile_id = ${session.profileId}::uuid
          and s.family_id = public.current_family_id() and s.shield_count > 0
        group by s.child_id, s.shield_count, f.streak_threshold
      ),
      eligible as (
        select * from target
        where total_missions > 0 and round(100.0 * completed_missions / total_missions) < streak_threshold
          and not exists (select 1 from public.streak_shield_uses su where su.child_id = target.child_id and su.shield_date = ${shieldDate}::date)
      ),
      used as (
        insert into public.streak_shield_uses (family_id, child_id, shield_date)
        select public.current_family_id(), child_id, ${shieldDate}::date from eligible
        returning child_id
      ),
      reduced as (
        update public.streaks s set shield_count = s.shield_count - 1, updated_at = now()
        from used u
        where s.child_id = u.child_id
        returning s.child_id, s.shield_count
      ),
      refreshed as (
        select public.refresh_child_streak(r.child_id) as streak from reduced r
      )
      select (streak).current_streak, (streak).best_streak, (streak).shield_count
      from refreshed
    `,
  ]);
  const result = rows[1]?.[0] as { current_streak: number; best_streak: number; shield_count: number } | undefined;
  if (!result) return Response.json({ error: "Não há escudo disponível ou o dia não pode ser protegido." }, { status: 400 });
  return Response.json({ ok: true, protectedDate: shieldDate, ...result });
}
