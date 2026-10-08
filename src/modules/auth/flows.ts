/**
 * Auth flows with the provider injected, so the behaviour (validation, rate
 * limiting, enumeration-safe responses, post-login housekeeping) is
 * unit-testable with a fake provider.
 */
import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { safeNextPath } from "@/lib/auth/safe-next";

import type { AuthProvider, AuthUser } from "./provider";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

export type FlowDeps = {
  provider: AuthProvider;
  siteUrl: string;
  /** Hashed client IP for limiter keys; optional. */
  ipHash?: string | undefined;
  now?: (() => Date) | undefined;
  /** Keeps the profile row in step with auth after sign-in; optional. */
  syncProfile?: ((user: AuthUser) => Promise<void>) | undefined;
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

function limited(deps: FlowDeps, keys: Array<{ key: string; limit: number; window: number }>): boolean {
  const now = deps.now?.() ?? new Date();
  return keys.some((k) => !consumeMemoryRateLimit(k.key, k.limit, k.window, now).allowed);
}

export async function registerFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult<{ needsConfirmation: boolean; next: string }>> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;
  if (deps.ipHash && limited(deps, [{ key: limiterKey("register:ip", deps.ipHash), ...LIMITS.register.perIp }])) {
    return { ok: false, code: "rate_limited", message: "Too many sign-ups from this connection. Please try later." };
  }
  const next = safeNextPath(input.next);
  const result = await deps.provider.signUp({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    acceptsMarketing: input.acceptsMarketing,
    redirectTo: `${deps.siteUrl}/auth/callback/?next=${encodeURIComponent(next)}`,
  });
  // Enumeration-safe: an existing email gets the same "check your inbox" response.
  if (!result.ok && result.code === "email_taken") return { ok: true, value: { needsConfirmation: true, next } };
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  return { ok: true, value: { needsConfirmation: result.value.needsConfirmation, next } };
}

export async function loginFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult<{ user: AuthUser; next: string }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;
  const keys: Array<{ key: string; limit: number; window: number }> = [{ key: limiterKey("login:email", input.email), ...LIMITS.login.perEmail }];
  if (deps.ipHash) keys.push({ key: limiterKey("login:ip", deps.ipHash), ...LIMITS.login.perIp });
  if (limited(deps, keys)) return { ok: false, code: "rate_limited", message: "Too many attempts. Please wait 15 minutes and try again." };

  const result = await deps.provider.signInWithPassword({ email: input.email, password: input.password });
  if (!result.ok) return { ok: false, code: result.code, message: result.message || "Incorrect email or password." };

  if (deps.syncProfile) {
    try {
      await deps.syncProfile(result.value);
    } catch (error) {
      console.error("[auth] profile sync failed", error);
    }
  }
  return { ok: true, value: { user: result.value, next: safeNextPath(input.next) } };
}

export async function forgotPasswordFlow(deps: FlowDeps, raw: unknown): Promise<FlowResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Enter a valid email address.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const keys: Array<{ key: string; limit: number; window: number }> = [{ key: limiterKey("forgot:email", parsed.data.email), ...LIMITS.forgot.perEmail }];
  if (deps.ipHash) keys.push({ key: limiterKey("forgot:ip", deps.ipHash), ...LIMITS.forgot.perIp });
  if (limited(deps, keys)) return { ok: false, code: "rate_limited", message: "Too many reset requests. Please wait before trying again." };
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
