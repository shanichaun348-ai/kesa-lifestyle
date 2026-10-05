import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Builds a Drizzle client over postgres.js. Shared by the Next.js server
 * (`client.ts`) and by CLI scripts (migrate, seed), which cannot import
 * `server-only`.
 *
 * `prepare: false` is required: the Supabase pooler runs in transaction mode
 * and cannot keep prepared statements (docs/05 §11a).
 */
export function createDatabase(connectionString: string, options: { max?: number } = {}): Database {
  const isLocal = /localhost|127.0.0.1|host.docker.internal/.test(connectionString);
  const sql = postgres(connectionString, isLocal ? { prepare: false, max: options.max ?? 10 } : { prepare: false, max: options.max ?? 10, ssl: "require" });
  return drizzle(sql, { schema, casing: "snake_case" });
}
