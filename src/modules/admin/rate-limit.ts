import "server-only";

/**
 * In-memory sliding-window rate limiter for the admin login endpoint.
 *
 * ─── What it protects ──────────────────────────────────────────────────────
 * Admin login: POST /admin/login (Server Action `signIn`).
 * NOT applied to any other endpoint currently.
 *
 * ─── Current limits ───────────────────────────────────────────────────────
 * Window  : 15 minutes (WINDOW_MS = 15 * 60 * 1000)
 * Ceiling : 10 failed attempts per IP per window (MAX_ATTEMPTS = 10)
 * Counter : increments on every failed attempt; does NOT reset on success —
 *           an attacker who guesses correctly once cannot clear the window.
 *
 * ─── Failure behavior (fail-closed) ───────────────────────────────────────
 * `isRateLimited` is called at the START of the handler (before credential
 * verification). When it returns true, the request is rejected with a generic
 * "try again in 15 minutes" message — credentials are never checked. The
 * limiter does NOT fail open: an exception in the prune path does not remove
 * the guard.
 *
 * ─── Multi-instance / serverless limitation ───────────────────────────────
 * State is per-process (in-memory Map). A Vercel / containerised deployment
 * with multiple function instances means each instance maintains its own
 * counter, so an adversary spreading requests across instances can exceed
 * the effective limit by a factor equal to the instance count.
 *
 * PHASE 2 MIGRATION NOTE:
 * Before production launch, replace this module with a distributed rate
 * limiter backed by Redis / Vercel KV (do NOT add that dependency now —
 * this note tracks the requirement). The public interface of this module
 * (`isRateLimited` / `recordFailedAttempt`) will stay the same; only the
 * backing store changes. This file's `"server-only"` guard must be kept.
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
