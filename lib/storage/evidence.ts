import { head } from "@vercel/blob";
import { requireDatabase, sql } from "@/lib/neon/db";

export const MAX_EVIDENCE_BYTES = 10_000_000;

type EvidenceInput = { storageUrl: string; assignmentId: string; familyId: string; profileId: string; fileName?: string };

function assertPrivateBlobUrl(storageUrl: string) {
  const parsed = new URL(storageUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".private.blob.vercel-storage.com")) throw new Error("Armazenamento de evidência inválido.");
}

export async function recordBlobEvidence(input: EvidenceInput) {
  assertPrivateBlobUrl(input.storageUrl);
  const blob = await head(input.storageUrl);
  if (!blob || !blob.contentType || !["image/jpeg", "image/png", "image/webp"].includes(blob.contentType)) throw new Error("A evidência precisa ser uma imagem JPEG, PNG ou WebP.");
  if (blob.size === null || blob.size <= 0 || blob.size > MAX_EVIDENCE_BYTES) throw new Error("A imagem deve ter no máximo 10 MB.");
  if (!sql) throw new Error("Configure o Neon para registrar evidências reais.");
  const db = requireDatabase();
  const safeFileName = (input.fileName || decodeURIComponent(new URL(input.storageUrl).pathname.split("/").pop() || "evidencia")).slice(0, 160);
  const rows = await db.transaction((tx) => [
    tx`select set_config('app.family_id', ${input.familyId}, true)`,
    tx`
      with inserted as (
        insert into public.task_evidence (family_id, assignment_id, submitted_by, child_id, storage_path, storage_key, mime_type, file_size, file_name, content_base64)
        select public.current_family_id(), ta.id, ${input.profileId}::uuid, ta.child_id, ${input.storageUrl}, ${input.storageUrl}, ${blob.contentType}, ${blob.size}, ${safeFileName}, null
        from public.task_assignments ta join public.children c on c.id = ta.child_id
        where ta.id = ${input.assignmentId}::uuid and ta.family_id = public.current_family_id() and c.profile_id = ${input.profileId}::uuid and ta.status in ('pending', 'late', 'returned')
        on conflict do nothing
        returning id
      )
      select id from inserted
      union all
      select te.id
      from public.task_evidence te
      where te.storage_key = ${input.storageUrl} and te.assignment_id = ${input.assignmentId}::uuid and te.family_id = public.current_family_id()
      limit 1
    `,
  ]);
  const evidence = (rows[1] as unknown as Array<{ id: string }>)[0];
  if (!evidence) throw new Error("Esta missão não aceita evidência agora.");
  return evidence.id;
}
