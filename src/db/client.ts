import "server-only";

import { requireServerEnv } from "@/lib/env";

import { createDatabase, type Database } from "./create";

let cached: Database | null = null;

/**
 * Application database handle for server code. Connects as the `kesa_app`
 * role (not the service role, not `postgres`) through the pooler.
 * Authorisation is enforced in module code before every query (ADR-26).
 */
export function getDb(): Database {
  cached ??= createDatabase(requireServerEnv("DATABASE_URL"));
  return cached;
}
