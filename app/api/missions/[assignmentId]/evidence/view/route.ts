import { get } from "@vercel/blob";
import { getAuthorizedSession } from "@/lib/auth/guards";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getAuthorizedSession();
  if (!session) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sql) return Response.json({ error: "Configure o Neon para visualizar evidências reais." }, { status: 503 });
  const { assignmentId } = await params;
  const familyId = session.familyId;
  const isParent = session.role === "parent";
  const db = requireDatabase();
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${familyId}, true)`,
    tx`
      select te.mime_type, te.content_base64, te.storage_path, te.purged_at
      from public.task_evidence te
      join public.task_assignments ta on ta.id = te.assignment_id
      join public.children c on c.id = ta.child_id
      where te.assignment_id = ${assignmentId}::uuid and te.family_id = public.current_family_id()
        and (${isParent} or c.profile_id = ${session.profileId}::uuid)
      order by te.created_at desc limit 1
    `,
  ]);
  const evidence = (rows[1] as unknown as Array<{ mime_type: string; content_base64: string | null; storage_path: string; purged_at: string | null }>)[0];
  if (!evidence || evidence.purged_at) return Response.json({ error: "Nenhuma foto disponível." }, { status: 404 });

  async function markViewed() {
    if (!isParent) return;
    try {
      await db.transaction((tx) => [
        tx`select set_config('app.family_id', ${familyId}, true)`,
        tx`
          update public.task_evidence
          set viewed_at = coalesce(viewed_at, now()), expires_at = coalesce(expires_at, now() + interval '2 days')
          where assignment_id = ${assignmentId}::uuid and storage_path = ${evidence.storage_path}
            and family_id = public.current_family_id() and purged_at is null
        `,
      ]);
    } catch {
      console.warn("evidence_retention_mark_failed", { assignmentId });
    }
  }

  if (evidence.storage_path.startsWith("https://") && evidence.storage_path.includes(".private.blob.vercel-storage.com/")) {
    const blob = await get(evidence.storage_path, { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return Response.json({ error: "Nenhuma foto disponível." }, { status: 404 });
    await markViewed();
    return new Response(blob.stream, { headers: { "Content-Type": blob.blob.contentType ?? evidence.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  if (evidence.content_base64) {
    await markViewed();
    return new Response(Buffer.from(evidence.content_base64, "base64"), { headers: { "Content-Type": evidence.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  return Response.json({ error: "Nenhuma foto disponível." }, { status: 404 });
}
