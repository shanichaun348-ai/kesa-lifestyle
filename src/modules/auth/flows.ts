/**
 * Auth flows with the provider and database injected, so the behaviour
 * (validation, rate limiting, enumeration-safe responses, post-login
 * housekeeping) is unit-testable with a fake provider.
 */
import { and, eq, isNull, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import { consumeRateLimit, limiterKey } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/auth/safe-next";

import type { AuthProvider, AuthUser } from "./provider";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

export type FlowDeps = {
  provider: AuthProvider;
  db: Db | null;
  siteUrl: string;
  /** Hashed client IP for limiter keys; optional. */
  ipHash?: string | undefined;
  now?: (() => Date) | undefined;
};

export type FlowResult<T = undefined> = { ok: true; value: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> | undefined };

const LIMITS = {
  login: { perEmail: { limit: 5, window: 900 }, perIp: { limit: 20, window: 3600 } },
  register: { perIp: { limit: 10, window: 3600 } },
  forgot: { perEmail: { limit: 3, window: 900 }, perIp: { limit: 10, window: 3600 } },
} as const;

function fieldErrorsFrom(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) out[issue.path.join(".")] = issue.message;
  return out;
}

async function limited(deps: FlowDeps, keys: Array<{ key: string; limit: number; window: number }>): Promise<boolean> {
  if (!deps.db) return false;
  for (const k of keys) {
    const r = await consumeRateLimit(deps.db, k.key, k.limit, k.window, deps.now?.() ?? new Date());
    if (!r.allowed) return true;
  }
  return false;
}

/** Guest orders placed with this email become the customer's on first login. */
export async function claimGuestOrders(db: Db, user: AuthUser): Promise<number> {
  if (!user.email) return 0;
  const updated = await db
    .update(schema.orders)
    .set({ profileId: user.id })
    .where(and(isNull(schema.orders.profileId), sql`lower(${schema.orders.guestEmail}) = ${user.email.toLowerCase()}`))
    .returning({ id: schema.orders.id });
  return updated.length;
}

/** Keep the profile row in step with auth (email changes, confirmed name). */
export async function syncProfile(db: Db, user: AuthUser): Promise<void> {
  await db
    .insert(schema.profiles)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({ target: schema.profiles.id, set: { email: user.email } });
}

async function existingProfileId(db: Db, id: string): Promise<string | null> {
  const [row] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.id, id)).limit(1);
  return row?.id ?? null;
}

export async function registerFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult<{ needsConfirmation: boolean; next: string }>> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;
  if (deps.ipHash && (await limited(deps, [{ key: limiterKey("register:ip", deps.ipHash), ...LIMITS.register.perIp }]))) {
    return { ok: false, code: "rate_limited", message: "Too many sign-ups from this connection. Please try later." };
  }
  const next = safeNextPath(input.next);
  const result = await deps.provider.signUp({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    redirectTo: `${deps.siteUrl}/auth/callback/?next=${encodeURIComponent(next)}`,
  });
  // Enumeration-safe: an existing email gets the same "check your inbox" response.
  if (!result.ok && result.code === "email_taken") return { ok: true, value: { needsConfirmation: true, next } };
  if (!result.ok) return { ok: false, code: result.code, message: result.message };

  if (deps.db && input.acceptsMarketing) {
    // The profile row is created by the auth trigger; link it when present and
    // keep the consent keyed by email otherwise (DPDP consent ledger, docs/08 §13).
    const profileId = result.value.userId ? await existingProfileId(deps.db, result.value.userId) : null;
    await deps.db.insert(schema.customerConsents).values({ profileId, email: input.email, channel: "email", topic: "offers", status: "opted_in", source: "register" });
  }
  return { ok: true, value: { needsConfirmation: result.value.needsConfirmation, next } };
}

export async function loginFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult<{ user: AuthUser; next: string; claimedOrders: number }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;
  const keys: Array<{ key: string; limit: number; window: number }> = [{ key: limiterKey("login:email", input.email), ...LIMITS.login.perEmail }];
  if (deps.ipHash) keys.push({ key: limiterKey("login:ip", deps.ipHash), ...LIMITS.login.perIp });
  if (await limited(deps, keys)) return { ok: false, code: "rate_limited", message: "Too many attempts. Please wait 15 minutes and try again." };

  const result = await deps.provider.signInWithPassword({ email: input.email, password: input.password });
  if (!result.ok) return { ok: false, code: result.code, message: result.message || "Incorrect email or password." };

  let claimedOrders = 0;
  if (deps.db) {
    await syncProfile(deps.db, result.value);
    claimedOrders = await claimGuestOrders(deps.db, result.value);
  }
  return { ok: true, value: { user: result.value, next: safeNextPath(input.next), claimedOrders } };
}

export async function forgotPasswordFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Enter a valid email address.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const keys: Array<{ key: string; limit: number; window: number }> = [{ key: limiterKey("forgot:email", parsed.data.email), ...LIMITS.forgot.perEmail }];
  if (deps.ipHash) keys.push({ key: limiterKey("forgot:ip", deps.ipHash), ...LIMITS.forgot.perIp });
  if (await limited(deps, keys)) return { ok: false, code: "rate_limited", message: "Too many reset requests. Please wait before trying again." };
  await deps.provider.requestPasswordReset({ email: parsed.data.email, redirectTo: `${deps.siteUrl}/auth/callback/?next=${encodeURIComponent("/account/reset-password/")}` });
  // Always the same response, whether or not the email exists.
  return { ok: true, value: undefined };
}

export async function resetPasswordFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const result = await deps.provider.updatePassword({ password: parsed.data.password });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  return { ok: true, value: undefined };
}
