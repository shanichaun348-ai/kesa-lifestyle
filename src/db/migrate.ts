/**
 * `pnpm db:migrate` — applies pending migrations from ./drizzle using the
 * direct (non-pooled) connection. Run by the operator against local and
 * staging; production runs through the protected CI job (docs/05 §12).
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "@/db/create";

async function main() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_DIRECT_URL (or DATABASE_URL) is not set.");
    process.exit(1);
  }
  const db = createDatabase(url, { max: 1 });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
