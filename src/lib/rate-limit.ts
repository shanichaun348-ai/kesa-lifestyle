import { sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { DbOrTx } from "@/db/types";

/**
 * Fixed-window rate limiter backed by Postgres (docs/11 §8). Used for
 * per-email and per-account limits on auth and review endpoints; IP-level
 * limits for anonymous traffic belong in the WAF.
 */
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export async function consumeRateLimit(db: DbOrTx, key: string, limit: number, windowSeconds: number, now: Date = new Date()): Promise<RateLimitResult> {
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`case when ${schema.rateLimits.windowStart} = ${windowStart} then ${schema.rateLimits.count} + 1 else 1 end`,
        windowStart,
      },
    })
    .returning({ count: schema.rateLimits.count });
  const count = row?.count ?? limit + 1;
  const windowEnd = new Date(new Date(windowStart).getTime() + windowSeconds * 1000);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)),
  };
}

/** Normalise an email for limiter keys (never store raw IPs; hash them upstream). */
export function limiterKey(scope: string, subject: string): string {
  return `${scope}:${subject.trim().toLowerCase()}`;
}
