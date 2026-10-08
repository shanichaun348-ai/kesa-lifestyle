/**
 * Fixed-window limiter held in process memory. Good enough to blunt
 * credential stuffing on a single instance; resets on deploy and is not
 * shared across serverless instances (Supabase Auth applies its own limits
 * underneath).
 */
const buckets = new Map<string, { windowStart: number; count: number }>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function consumeMemoryRateLimit(key: string, limit: number, windowSeconds: number, now: Date = new Date()): RateLimitResult {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const current = buckets.get(key);
  const count = current && current.windowStart === windowStart ? current.count + 1 : 1;
  if (buckets.size >= MAX_KEYS && !current) buckets.clear();
  buckets.set(key, { windowStart, count });
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now.getTime()) / 1000)),
  };
}

/** Normalise an email for limiter keys (never store raw IPs; hash them upstream). */
export function limiterKey(scope: string, subject: string): string {
  return `${scope}:${subject.trim().toLowerCase()}`;
}
