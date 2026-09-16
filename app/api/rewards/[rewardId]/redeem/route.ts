import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function POST(_request: Request, { params }: { params: Promise<{ rewardId: string }> }) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente um guardião pode solicitar recompensas." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para solicitar recompensas reais." }, { status: 503 });
  const { rewardId } = await params;
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with target as (
        select r.id, r.cost, c.id as child_id, c.coin_balance
        from public.rewards r
        join public.children c on c.family_id = public.current_family_id()
        join public.profiles p on p.id = c.profile_id
        where r.id = ${rewardId}::uuid
          and r.family_id = public.current_family_id()
          and r.is_active
          and p.id = ${session.profileId}::uuid
          and c.coin_balance >= r.cost
      )
      insert into public.reward_redemptions (family_id, reward_id, child_id, cost)
      select public.current_family_id(), id, child_id, cost
      from target
      returning id, reward_id, child_id, cost, status
    `,
  ]);
  const redemption = rows[1]?.[0];
  if (!redemption) return Response.json({ error: "Recompensa indisponível ou saldo insuficiente." }, { status: 400 });
  return Response.json({ redemption }, { status: 201 });
}
