/**
 * Embedded Postgres (PGlite) harness for migration and seed validation.
 * Real Postgres compiled to WASM, so constraints, triggers, RLS and
 * policies behave exactly as on Supabase. A small prelude recreates the
 * parts Supabase provides out of the box: the `auth` schema with
 * `auth.users` and `auth.uid()`, and the platform roles.
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/db/schema";

export const SUPABASE_PRELUDE = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
`;

export type TestDb = PgliteDatabase<typeof schema>;

export async function createMigratedDb(): Promise<{ db: TestDb; client: PGlite }> {
  const client = new PGlite({ extensions: { pg_trgm } });
  await client.exec(SUPABASE_PRELUDE);
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, client };
}
