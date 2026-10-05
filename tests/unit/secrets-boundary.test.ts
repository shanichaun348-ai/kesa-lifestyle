import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards the server/browser boundary (docs/11 §9):
 * - The service-role key and database URL are read only in the files that
 *   are allowed to hold them.
 * - No client component imports the admin Supabase client, the database
 *   client or the server env accessor.
 */

const SRC = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

const files = walk(SRC);
const rel = (f: string) => path.relative(process.cwd(), f).replace(/\\/g, "/");

describe("secrets boundary", () => {
  it("reads SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL only in env, CLI scripts or server-only modules", () => {
    const cliScripts = new Set(["src/lib/env.ts", "src/db/migrate.ts", "src/db/seed/run.ts"]);
    const offenders = files.filter((f) => {
      const source = readFileSync(f, "utf8");
      if (!/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|DATABASE_DIRECT_URL/.test(source)) return false;
      if (cliScripts.has(rel(f))) return false;
      return !/^import "server-only";/m.test(source);
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it("never imports server-only modules from client components", () => {
    const forbidden = /@\/lib\/supabase\/admin|@\/lib\/supabase\/server|@\/db\/client|@\/db\/create|getServerEnv|requireServerEnv/;
    const offenders = files.filter((f) => {
      const source = readFileSync(f, "utf8");
      return /^\s*["']use client["']/m.test(source) && forbidden.test(source);
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it("privileged modules are marked server-only", () => {
    for (const f of ["src/lib/supabase/admin.ts", "src/lib/supabase/server.ts", "src/db/client.ts"]) {
      expect(readFileSync(path.join(process.cwd(), f), "utf8")).toMatch(/^import "server-only";/m);
    }
  });

  it("no literal secrets are committed", () => {
    const pattern = /(sk_live_|rzp_live_|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.|postgres(ql)?:\/\/[^:\s]+:[^@\s]{8,}@)/;
    const offenders = files.filter((f) => pattern.test(readFileSync(f, "utf8")));
    expect(offenders.map(rel)).toEqual([]);
  });
});
