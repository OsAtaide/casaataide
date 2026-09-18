import { del } from "@vercel/blob";
import { requireDatabase, sql } from "@/lib/neon/db";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!sql) return Response.json({ error: "Configure o Neon para limpar evidências." }, { status: 503 });
  const db = requireDatabase();
  const rows = await db`select id, storage_path from public.task_evidence where expires_at <= now() and purged_at is null order by expires_at asc limit 100` as Array<{ id: string; storage_path: string }>;
  let purged = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      if (row.storage_path.startsWith("https://") && row.storage_path.includes(".private.blob.vercel-storage.com/")) await del(row.storage_path);
      await db`update public.task_evidence set storage_path = ${`expired://task-evidence/${row.id}`}, storage_key = ${`expired://task-evidence/${row.id}`}, content_base64 = null, purged_at = now() where id = ${row.id}::uuid and purged_at is null`;
      purged += 1;
    } catch { failed += 1; }
  }
  return Response.json({ ok: true, found: rows.length, purged, failed });
}
