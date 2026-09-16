import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/neon/schema";

const connectionString = process.env.DATABASE_URL;

/**
 * O cliente é criado apenas no servidor. Rotas e Server Actions devem
 * derivar o family_id da sessão antes de consultar dados de negócio.
 */
export const sql = connectionString ? neon(connectionString) : null;
export const drizzleDb = connectionString ? drizzle(sql!, { schema }) : null;

export function requireDatabase() {
  if (!sql) throw new Error("DATABASE_URL não configurada.");
  return sql;
}
