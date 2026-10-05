import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/** Any Drizzle Postgres handle over our schema (postgres.js in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = PgTransaction<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
/** Either a database or an open transaction. */
export type DbOrTx = Db | Tx;

/** Postgres unique-violation detection across drivers. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? (error as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505";
}
