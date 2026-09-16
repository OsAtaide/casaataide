import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

const rewardSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome para a recompensa.").max(100),
  description: z.string().trim().max(240).default(""),
  cost: z.number().int().positive("O custo deve ser maior que zero.").max(100000),
});

export async function GET() {
  const session = await getAuthorizedSession();
  if (!session) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sql) return Response.json({ rewards: [], redemptions: [], demo: true });
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      select id, name, description, cost, is_active
      from public.rewards
      where family_id = public.current_family_id() and is_active
      order by cost, created_at desc
    `,
    tx`
      select rr.id, rr.reward_id, r.name as reward_name, rr.child_id, p.display_name as child_name,
        rr.cost, rr.status, rr.requested_at
      from public.reward_redemptions rr
      join public.rewards r on r.id = rr.reward_id
      join public.children c on c.id = rr.child_id
      join public.profiles p on p.id = c.profile_id
      where rr.family_id = public.current_family_id()
        and (${session.role === "parent"} or p.id = ${session.profileId}::uuid)
      order by rr.requested_at desc
      limit 50
    `,
  ]);
  return Response.json({ rewards: rows[1], redemptions: rows[2] });
}

export async function POST(request: Request) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode criar recompensas." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para criar recompensas reais." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie um JSON válido." }, { status: 400 }); }
  const parsed = rewardSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      insert into public.rewards (family_id, created_by, name, description, cost)
      values (public.current_family_id(), ${session.profileId}::uuid, ${parsed.data.name}, ${parsed.data.description}, ${parsed.data.cost})
      returning id, name, description, cost, is_active
    `,
  ]);
  return Response.json({ reward: rows[1]?.[0] }, { status: 201 });
}
