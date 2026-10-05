import { z } from "zod";

/**
 * Environment validation (docs/11 §9). Two schemas:
 * - `serverEnv`: secrets and connection strings. Only importable from
 *   server code; never reaches the browser bundle because nothing under
 *   `NEXT_PUBLIC_` is read here and the module is never imported by client
 *   components (enforced by tests/unit/secrets-boundary.test.ts).
 * - `publicEnv`: values that are safe to inline into the client bundle.
 *
 * Every variable is optional at build time so the app builds without a
 * database (demo repositories). Features that need a value call
 * `requireServerEnv()` and fail with a clear message at runtime.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Postgres connection for the `kesa_app` role via the Supabase pooler (transaction mode). */
  DATABASE_URL: z.url().optional(),
  /** Direct (non-pooled) connection used only by migrations and seeds. */
  DATABASE_DIRECT_URL: z.url().optional(),
  /** Service-role key. Server only. Used for Storage admin and auth admin calls, never for data queries. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  /** Shared secret for cron-invoked job routes. */
  CRON_SECRET: z.string().min(16).optional(),
  /** Allows the seed script to run against a non-local database. Never set in production. */
  ALLOW_SEED: z.enum(["1"]).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function parse<T>(schema: z.ZodType<T>, input: Record<string, string | undefined>, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid ${label} environment:\n${issues}`);
  }
  return result.data;
}

/** Public values. `process.env.NEXT_PUBLIC_*` must be referenced literally so Next can inline them. */
export const publicEnv: PublicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  "public",
);

let cachedServerEnv: ServerEnv | null = null;

/** Server-side values. Call only from server code. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() was called in the browser. Server secrets must never reach the client.");
  }
  cachedServerEnv ??= parse(serverSchema, process.env, "server");
  return cachedServerEnv;
}

/** Fetch a server variable or fail with an actionable message. */
export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];
  if (value === undefined || value === null) {
    throw new Error(`${key} is not set. Copy .env.example to .env.local and fill it in (see README → Environment variables).`);
  }
  return value as NonNullable<ServerEnv[K]>;
}
