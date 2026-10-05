import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";

/** Bearer check for cron-invoked job routes. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function isAuthorisedJobRequest(request: Request): boolean {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
