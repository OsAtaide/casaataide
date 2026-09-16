import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

const dateSchema = z.string().date();

export async function GET(request: Request) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode acessar relatórios." }, { status: 403 });
  if (!sql) return Response.json({ report: null, demo: true });
  const search = new URL(request.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = search.get("from") ?? new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const to = search.get("to") ?? today;
  if (!dateSchema.safeParse(from).success || !dateSchema.safeParse(to).success || from > to) return Response.json({ error: "Período inválido." }, { status: 400 });
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      select p.id as profile_id, p.display_name,
        count(ta.id)::int as total_missions,
        count(ta.id) filter (where ta.status in ('completed', 'approved'))::int as completed_missions,
        count(ta.id) filter (where ta.status = 'waiting_approval')::int as waiting_missions,
        count(ta.id) filter (where ta.status in ('missed', 'late') or (ta.status = 'pending' and ta.scheduled_for < current_date))::int as overdue_missions,
        coalesce((select sum(x.amount)::int from public.xp_transactions x where x.child_id = c.id and x.created_at::date between ${from}::date and ${to}::date), 0)::int as xp_earned,
        coalesce((select sum(k.amount)::int from public.coin_transactions k where k.child_id = c.id and k.created_at::date between ${from}::date and ${to}::date), 0)::int as coin_delta
      from public.children c
      join public.profiles p on p.id = c.profile_id
      left join public.task_assignments ta on ta.child_id = c.id and ta.family_id = public.current_family_id() and ta.scheduled_for between ${from}::date and ${to}::date
      where c.family_id = public.current_family_id()
      group by p.id, p.display_name, c.id
      order by p.display_name
    `,
  ]);
  return Response.json({ report: { from, to, children: rows[1] } });
}
