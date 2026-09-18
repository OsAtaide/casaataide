import { getAuthorizedSession } from "@/lib/auth/guards";
import { sql } from "@/lib/neon/db";
import { recordBlobEvidence } from "@/lib/storage/evidence";

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession("child");
  if (!session) return Response.json({ error: "Somente o guardião pode enviar evidência." }, { status: 403 });
  if (!sql) return Response.json({ error: "Configure o Neon para registrar evidências reais." }, { status: 503 });
  const { assignmentId } = await params;
  let body: { storageUrl?: string; fileName?: string };
  try { body = await request.json() as { storageUrl?: string; fileName?: string }; } catch { return Response.json({ error: "Envie um JSON válido." }, { status: 400 }); }
  if (!body.storageUrl) return Response.json({ error: "O upload da foto não foi concluído." }, { status: 400 });
  try {
    const evidenceId = await recordBlobEvidence({ storageUrl: body.storageUrl, fileName: body.fileName, assignmentId, familyId: session.familyId, profileId: session.profileId });
    return Response.json({ ok: true, evidenceId }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a foto." }, { status: 400 }); }
}
