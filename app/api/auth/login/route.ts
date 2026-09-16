import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifySecret } from "@/lib/auth/password";
import { sql, requireDatabase } from "@/lib/neon/db";
import type { AuthRole } from "@/lib/auth/types";

const inputSchema = z.object({
  profileId: z.string().min(1),
  role: z.enum(["parent", "child"]),
  identifier: z.string().trim().optional(),
  secret: z.string().min(1),
});

const demoProfiles = {
  "parent-demo": { familyId: "demo-family", role: "parent" as const, displayName: "Guardião Principal" },
  "child-adventure-demo": { familyId: "demo-family", role: "child" as const, displayName: "Jennifer Ataide" },
  "child-pro-demo": { familyId: "demo-family", role: "child" as const, displayName: "Richardson Ataide" },
};

function demoLogin(profileId: string, role: AuthRole, secret: string) {
  const profile = demoProfiles[profileId as keyof typeof demoProfiles];
  if (!profile || profile.role !== role || secret !== "demo") return null;
  return createSession({ profileId, familyId: profile.familyId, role: profile.role, displayName: profile.displayName });
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Dados de acesso inválidos." }, { status: 400 });
  const input = parsed.data;

  if (!sql) {
    const session = await demoLogin(input.profileId, input.role, input.secret);
    return session ? Response.json({ ok: true, session }) : Response.json({ error: "Use o acesso de demonstração local." }, { status: 401 });
  }

  const db = requireDatabase();
  const rows = await db`select id, family_id, role, display_name, password_hash, pin_hash from public.profiles where id::text = ${input.profileId} and role = ${input.role} and (${input.role} = 'child' or lower(coalesce(email, '')) = lower(coalesce(${input.identifier ?? ""}, ''))) limit 1`;
  const profile = rows[0] as { id: string; family_id: string; role: AuthRole; display_name: string; password_hash: string | null; pin_hash: string | null } | undefined;
  const validSecret = profile && verifySecret(input.secret, input.role === "parent" ? profile.password_hash : profile.pin_hash);
  if (!profile || !validSecret) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });

  const session = await createSession({ profileId: profile.id, familyId: profile.family_id, role: profile.role, displayName: profile.display_name });
  return Response.json({ ok: true, session });
}
