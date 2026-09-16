import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

const updateMissionSchema = z.object({
  action: z.literal("update"),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(240).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  penaltyCoins: z.number().int().nonnegative().max(1000).optional(),
  requiresApproval: z.boolean().optional(),
  requiresPhoto: z.boolean().optional(),
}).refine((input) => Object.keys(input).some((key) => key !== "action"), "Informe ao menos um campo para editar.");
const missionActionSchema = z.union([
  z.object({ action: z.enum(["archive", "restore"]) }),
  updateMissionSchema,
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("parent");
  if (!session) return Response.json({ error: "Somente o responsável pode gerenciar missões." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para gerenciar missões reais." }, { status: 503 });

  const { assignmentId } = await params;
  if (!z.string().uuid().safeParse(assignmentId).success) return Response.json({ error: "Missão inválida." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }
  const parsed = missionActionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Ação de missão inválida." }, { status: 400 });

  const db = requireDatabase();
  if (parsed.data.action === "update") {
    const input = parsed.data;
    const rows = await db.transaction((tx) => [
      tx`select set_config('app.family_id', ${session.familyId}, true)`,
      tx`
        update public.tasks t
        set name = coalesce(${input.title ?? null}, t.name),
            description = coalesce(${input.description ?? null}, t.description),
            priority = coalesce(${input.priority ?? null}, t.priority),
            penalty_coins = coalesce(${input.penaltyCoins ?? null}, t.penalty_coins),
            penalty_amount = coalesce(${input.penaltyCoins ?? null}, t.penalty_amount),
            requires_approval = coalesce(${input.requiresApproval ?? null}, t.requires_approval),
            requires_photo = coalesce(${input.requiresPhoto ?? null}, t.requires_photo),
            updated_at = now()
        from public.task_assignments ta
        where ta.id = ${assignmentId}::uuid and ta.task_id = t.id and t.family_id = public.current_family_id()
        returning t.id as task_id
      `,
    ]);
    const result = (rows[1] as unknown as Array<{ task_id: string }>)[0];
    if (!result) return Response.json({ error: "Missão não encontrada nesta família." }, { status: 404 });
    return Response.json({ ok: true, taskId: result.task_id, action: "update" });
  }
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with target as (
        select t.id as task_id
        from public.task_assignments ta
        join public.tasks t on t.id = ta.task_id
        where ta.id = ${assignmentId}::uuid
          and ta.family_id = public.current_family_id()
      ), updated as (
        update public.tasks t
        set is_active = ${parsed.data.action === "restore"}, updated_at = now()
        from target
        where t.id = target.task_id
          and t.family_id = public.current_family_id()
        returning t.id as task_id, t.is_active
      )
      select task_id, is_active from updated
    `,
  ]);
  const result = (rows[1] as unknown as Array<{ task_id: string; is_active: boolean }>)[0];
  if (!result) return Response.json({ error: "Missão não encontrada nesta família." }, { status: 404 });
  return Response.json({ ok: true, taskId: result.task_id, isActive: result.is_active });
}
