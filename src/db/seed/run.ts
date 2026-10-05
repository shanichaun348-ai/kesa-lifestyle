/**
 * `pnpm db:seed` — development seed runner.
 * Refuses to run against anything that is not a local database unless
 * ALLOW_SEED=1 is set explicitly. Uses the direct (non-pooled) URL.
 */
import { createDatabase } from "@/db/create";

import { seed } from "./seed";

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|host\.docker\.internal|db)$/;

async function main() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_DIRECT_URL (or DATABASE_URL) is not set.");
    process.exit(1);
  }
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.test(host) && process.env.ALLOW_SEED !== "1") {
    console.error(`Refusing to seed non-local host "${host}". Set ALLOW_SEED=1 only for staging, never production.`);
    process.exit(1);
  }
  const db = createDatabase(url, { max: 1 });
  const summary = await seed(db);
  console.log("Seed complete:", summary);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
