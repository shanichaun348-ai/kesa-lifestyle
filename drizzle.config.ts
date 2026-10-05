import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration (ADR-05).
 * - `generate` works offline from the schema; `migrate`/`push` need DATABASE_URL.
 * - Roles: Supabase's own roles are left alone; `kesa_app` is managed by migrations.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres",
  },
  entities: {
    roles: { provider: "supabase", include: ["kesa_app"] },
  },
  strict: true,
  verbose: true,
});
