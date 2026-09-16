import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

const schema = z.object({ reason: z.string().trim().min(3, "Explique o que precisa ser corrigido.").max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode devolver missões." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para devolver missões reais." }, { status: 503 });
  const { assignmentId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie um JSON válido." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Justificativa inválida." }, { status: 400 });
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`update public.task_assignments set status = 'returned', returned_at = now(), return_reason = ${parsed.data.reason}, updated_at = now() where id = ${assignmentId}::uuid and family_id = public.current_family_id() and status in ('waiting_approval', 'completed') returning id`,
  ]);
  if (!(rows[1] as unknown as Array<{ id: string }>)[0]) return Response.json({ error: "A missão não está disponível para devolução." }, { status: 404 });
  return Response.json({ ok: true, status: "returned" });
}
