import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  return session ? Response.json({ session }) : Response.json({ session: null }, { status: 401 });
}
