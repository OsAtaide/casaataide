import { z } from "zod";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";
import { createPrivateStorageKey } from "@/lib/storage/service";

const schema = z.object({
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(2_000_000),
  contentBase64: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, "Arquivo de imagem inválido.").max(2_800_000),
});

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente o guardião pode enviar evidência." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para enviar evidências reais." }, { status: 503 });
  const { assignmentId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie um JSON válido." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Evidência inválida." }, { status: 400 });
  const db = requireDatabase();
  const storageKey = createPrivateStorageKey();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      with new_key as (select ${storageKey}::text as value)
      insert into public.task_evidence (family_id, assignment_id, submitted_by, child_id, storage_path, storage_key, mime_type, file_size, file_name, content_base64)
      select public.current_family_id(), ta.id, ${session.profileId}::uuid, ta.child_id, new_key.value, new_key.value, ${parsed.data.mimeType}, ${parsed.data.fileSize}, ${parsed.data.fileName}, ${parsed.data.contentBase64}
      from public.task_assignments ta join public.children c on c.id = ta.child_id cross join new_key
      where ta.id = ${assignmentId}::uuid and ta.family_id = public.current_family_id() and c.profile_id = ${session.profileId}::uuid and ta.status in ('pending', 'late', 'returned')
      returning id
    `,
  ]);
  const evidence = (rows[1] as unknown as Array<{ id: string }>)[0];
  if (!evidence) return Response.json({ error: "Esta missão não aceita evidência agora." }, { status: 404 });
  return Response.json({ ok: true, evidenceId: evidence.id }, { status: 201 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession();
  if (!session) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sql) return Response.json({ evidence: null, demo: true });
  const { assignmentId } = await params;
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`
      select te.mime_type, te.file_name, te.content_base64, te.created_at
      from public.task_evidence te
      join public.task_assignments ta on ta.id = te.assignment_id
      join public.children c on c.id = ta.child_id
      where te.assignment_id = ${assignmentId}::uuid and te.family_id = public.current_family_id()
        and (${session.role === "parent"} or c.profile_id = ${session.profileId}::uuid)
      order by te.created_at desc limit 1
    `,
  ]);
  const evidence = (rows[1] as unknown as Array<{ mime_type: string; file_name: string; content_base64: string | null; created_at: string }>)[0];
  if (!evidence) return Response.json({ evidence: null });
  return Response.json({ evidence: { fileName: evidence.file_name, mimeType: evidence.mime_type, dataUrl: evidence.content_base64 ? `data:${evidence.mime_type};base64,${evidence.content_base64}` : null, createdAt: evidence.created_at } });
}
