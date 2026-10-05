import "server-only";

/**
 * In-memory sliding-window rate limiter for the admin login endpoint.
 *
 * Tracks failed attempts per IP. Successful logins do NOT clear the counter —
 * an attacker who gets lucky once can't reset the window for that IP.
 *
 * Limitations: state is per-process. In a multi-instance (serverless) deployment
 * replace this with a Redis-backed implementation (e.g. Vercel KV) before going
 * to production. The per-instance limit still meaningfully slows brute-force
 * because each attempt hits a cold function instance.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15-minute window
const MAX_ATTEMPTS = 10; // max failed attempts per IP per window

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

/** Purge entries older than two windows to bound memory usage. */
function prune(now: number) {
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS * 2) store.delete(key);
  }
}

/**
 * Records a failed login attempt for the given IP.
 * Returns `{ allowed: boolean; remaining: number }`.
 * Call BEFORE checking credentials so enumeration is also throttled.
 */
export function recordFailedAttempt(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (store.size > 10_000) prune(now); // prevent unbounded growth

  const entry = store.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  return { allowed: entry.count <= MAX_ATTEMPTS, remaining };
}

/**
 * Returns true when the IP is currently rate-limited (window not yet expired
 * and attempts exhausted). Call at the start of the login handler.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}
