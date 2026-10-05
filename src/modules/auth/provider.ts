/**
 * Authentication provider contract (ADR-06, ADR-32). Supabase Auth is the
 * production implementation; tests use an in-memory fake so the flows
 * (validation, rate limits, enumeration-safe messages, cart merge, guest
 * order claim) are exercised without network access.
 */

export type AuthUser = { id: string; email: string; emailConfirmed: boolean };

export type AuthResult<T = undefined> = { ok: true; value: T } | { ok: false; code: AuthErrorCode; message: string };

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "weak_password"
  | "rate_limited"
  | "not_configured"
  | "no_session"
  | "unknown";

export interface AuthProvider {
  signUp(input: { email: string; password: string; firstName?: string | undefined; lastName?: string | undefined; redirectTo: string }): Promise<AuthResult<{ userId: string | null; needsConfirmation: boolean }>>;
  signInWithPassword(input: { email: string; password: string }): Promise<AuthResult<AuthUser>>;
  signOut(): Promise<void>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<AuthResult>;
  /** Requires a recovery session (from the emailed link) or a signed-in session. */
  updatePassword(input: { password: string }): Promise<AuthResult>;
  getUser(): Promise<AuthUser | null>;
}
