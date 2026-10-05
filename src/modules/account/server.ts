import "server-only";

import { getDb } from "@/db/client";
import { getServerEnv } from "@/lib/env";

import { createAccountService, type AccountService } from "./service";

let cached: AccountService | null = null;

/** Account service bound to the real database, or null without one. */
export function getAccountService(): AccountService | null {
  if (!getServerEnv().DATABASE_URL) return null;
  cached ??= createAccountService(getDb());
  return cached;
}
