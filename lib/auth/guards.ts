import { getSession } from "@/lib/auth/session";
import type { AuthRole, AuthSession } from "@/lib/auth/types";

export async function getAuthorizedSession(role?: AuthRole): Promise<AuthSession | null> {
  const session = await getSession();
  if (!session || (role && session.role !== role)) return null;
  return session;
}

