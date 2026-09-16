import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { requireDatabase, sql } from "@/lib/neon/db";
import type { AuthRole, AuthSession } from "@/lib/auth/types";

const COOKIE_NAME = "casaquest_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const DEMO_SECRET = "local-demo-only-secret";

function sessionCookieOptions() {
  const secure = process.env.SECURE_COOKIES === "true" || process.env.VERCEL === "1";
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: SESSION_TTL_SECONDS };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function demoToken(session: Omit<AuthSession, "sessionId">) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString("base64url");
  const signature = createHmac("sha256", process.env.SESSION_SECRET || DEMO_SECRET).update(payload).digest("base64url");
  return `demo.${payload}.${signature}`;
}

function readDemoToken(token: string): AuthSession | null {
  const [, payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", process.env.SESSION_SECRET || DEMO_SECRET).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Omit<AuthSession, "sessionId"> & { exp: number };
    if (parsed.exp < Date.now() || !parsed.profileId || !parsed.familyId || !parsed.role) return null;
    return { ...parsed, sessionId: "demo-session" };
  } catch {
    return null;
  }
}

export async function createSession(input: Omit<AuthSession, "sessionId">) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  let sessionId = "demo-session";

  if (sql) {
    const db = requireDatabase();
    const rows = await db`insert into public.auth_sessions (token_hash, profile_id, family_id, expires_at) values (${digest(token)}, ${input.profileId}, ${input.familyId}, ${expiresAt}) returning id`;
    sessionId = String(rows[0]?.id ?? "");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sql ? token : demoToken(input), sessionCookieOptions());
  return { ...input, sessionId };
}

export async function getSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  if (!sql) return token.startsWith("demo.") ? readDemoToken(token) : null;

  const db = requireDatabase();
  const rows = await db`select s.id as session_id, s.profile_id, s.family_id, p.role, p.display_name from public.auth_sessions s join public.profiles p on p.id = s.profile_id where s.token_hash = ${digest(token)} and s.revoked_at is null and s.expires_at > now() limit 1`;
  const row = rows[0] as { session_id: string; profile_id: string; family_id: string; role: AuthRole; display_name: string } | undefined;
  return row ? { sessionId: row.session_id, profileId: row.profile_id, familyId: row.family_id, role: row.role, displayName: row.display_name } : null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token && sql && !token.startsWith("demo.")) {
    const db = requireDatabase();
    await db`update public.auth_sessions set revoked_at = now() where token_hash = ${digest(token)}`;
  }
  cookieStore.delete(COOKIE_NAME);
}
