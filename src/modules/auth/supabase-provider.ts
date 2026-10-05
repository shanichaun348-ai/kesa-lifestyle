import "server-only";

import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthProvider, AuthResult, AuthUser } from "./provider";

/**
 * Supabase Auth adapter. Runs only on the server with the request's cookie
 * jar, so session cookies are set/refreshed from Server Actions and never
 * exposed to client JavaScript.
 */
function mapError(error: AuthError): AuthResult<never> {
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) return { ok: false, code: "invalid_credentials", message: "Incorrect email or password." };
  if (msg.includes("email not confirmed")) return { ok: false, code: "email_not_confirmed", message: "Confirm your email first. Check your inbox for the link." };
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user_already_exists")) return { ok: false, code: "email_taken", message: "" };
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("at least"))) return { ok: false, code: "weak_password", message: "Choose a stronger password." };
  if (error.status === 429) return { ok: false, code: "rate_limited", message: "Too many attempts. Please wait a few minutes." };
  return { ok: false, code: "unknown", message: "Something went wrong. Please try again." };
}

function toUser(u: { id: string; email?: string | undefined; email_confirmed_at?: string | undefined }): AuthUser {
  return { id: u.id, email: u.email ?? "", emailConfirmed: Boolean(u.email_confirmed_at) };
}

export class SupabaseAuthProvider implements AuthProvider {
  private async client(): Promise<SupabaseClient> {
    return createSupabaseServerClient();
  }

  async signUp(input: { email: string; password: string; firstName?: string | undefined; lastName?: string | undefined; redirectTo: string }) {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { emailRedirectTo: input.redirectTo, data: { first_name: input.firstName ?? null, last_name: input.lastName ?? null } },
    });
    if (error) return mapError(error);
    // Supabase returns a user with an empty identities array when the email already exists (enumeration-safe).
    const exists = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (exists) return { ok: false as const, code: "email_taken" as const, message: "" };
    return { ok: true as const, value: { userId: data.user?.id ?? null, needsConfirmation: !data.session } };
  }

  async signInWithPassword(input: { email: string; password: string }) {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) return mapError(error);
    if (!data.user) return { ok: false as const, code: "unknown" as const, message: "Something went wrong. Please try again." };
    return { ok: true as const, value: toUser(data.user) };
  }

  async signOut() {
    const supabase = await this.client();
    await supabase.auth.signOut({ scope: "local" });
  }

  async requestPasswordReset(input: { email: string; redirectTo: string }) {
    const supabase = await this.client();
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, { redirectTo: input.redirectTo });
    if (error && error.status !== 429) return { ok: true as const, value: undefined }; // never reveal whether the email exists
    if (error) return mapError(error);
    return { ok: true as const, value: undefined };
  }

  async updatePassword(input: { password: string }) {
    const supabase = await this.client();
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return { ok: false as const, code: "no_session" as const, message: "Open the reset link from your email first." };
    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) return mapError(error);
    return { ok: true as const, value: undefined };
  }

  async getUser() {
    const supabase = await this.client();
    const { data } = await supabase.auth.getUser();
    return data.user ? toUser(data.user) : null;
  }
}
