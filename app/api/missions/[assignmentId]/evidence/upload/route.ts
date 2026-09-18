import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";
import { MAX_EVIDENCE_BYTES, recordBlobEvidence } from "@/lib/storage/evidence";

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente o guardião pode enviar evidência." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para enviar evidências reais." }, { status: 503 });
  const { assignmentId } = await params;
  const db = requireDatabase();
  const allowed = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${session.familyId}, true)`,
    tx`select ta.id from public.task_assignments ta join public.children c on c.id = ta.child_id where ta.id = ${assignmentId}::uuid and ta.family_id = public.current_family_id() and c.profile_id = ${session.profileId}::uuid and ta.status in ('pending', 'late', 'returned')`,
  ]);
  if (!(allowed[1] as unknown as Array<{ id: string }>)[0]) return Response.json({ error: "Esta missão não aceita evidência agora." }, { status: 404 });
  let body: HandleUploadBody;
  try { body = (await request.json()) as HandleUploadBody; } catch { return Response.json({ error: "Envie um pedido de upload válido." }, { status: 400 }); }
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({ allowedContentTypes: ["image/jpeg", "image/png", "image/webp"], maximumSizeInBytes: MAX_EVIDENCE_BYTES, addRandomSuffix: true, tokenPayload: JSON.stringify({ assignmentId, familyId: session.familyId, profileId: session.profileId, fileName: pathname.split("/").pop() }) }),
      onUploadCompleted: async ({ blob, tokenPayload }) => { if (!tokenPayload) throw new Error("Token de upload inválido."); const payload = JSON.parse(tokenPayload) as { assignmentId: string; familyId: string; profileId: string; fileName?: string }; await recordBlobEvidence({ ...payload, storageUrl: blob.url }); },
    });
    return Response.json(jsonResponse);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível preparar o upload." }, { status: 400 }); }
}
