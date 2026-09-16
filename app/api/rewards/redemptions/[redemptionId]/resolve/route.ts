import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

const inputSchema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function POST(request: Request, { params }: { params: Promise<{ redemptionId: string }> }) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode revisar resgates." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para revisar resgates reais." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie um JSON válido." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Status de revisão inválido." }, { status: 400 });
  const { redemptionId } = await params;
  const db = requireDatabase();
  if (parsed.data.status === "rejected") {
    const rows = await db.transaction((tx) => [
      tx`select set_config('app.family_id', ${session.familyId}, true)`,
      tx`
        update public.reward_redemptions
        set status = 'rejected', resolved_at = now(), resolved_by = ${session.profileId}::uuid
        where id = ${redemptionId}::uuid and family_id = public.current_family_id() and status = 'requested'
        returning id
      `,
    ]);
    if (!rows[1]?.[0]) return Response.json({ error: "Resgate não está pendente." }, { status: 404 });
    return Response.json({ ok: true, status: "rejected" });
  }
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with updated as (
        update public.reward_redemptions rr
        set status = 'approved', resolved_at = now(), resolved_by = ${session.profileId}::uuid
        where rr.id = ${redemptionId}::uuid and rr.family_id = public.current_family_id() and rr.status = 'requested'
        returning rr.id, rr.child_id, rr.reward_id, rr.cost
      ),
      coin_award as (
        select u.id
        from updated u
        cross join lateral public.apply_coin_transaction(u.child_id, -u.cost, 'reward', u.reward_id)
      )
      select u.id
      from updated u
      join coin_award ca on ca.id = u.id
    `,
  ]);
  if (!rows[1]?.[0]) return Response.json({ error: "Resgate não está pendente ou saldo insuficiente." }, { status: 400 });
  return Response.json({ ok: true, status: "approved", charged: true });
}
