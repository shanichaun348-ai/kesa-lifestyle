import type { AuthProvider, AuthResult, AuthUser } from "@/modules/auth/provider";

/** In-memory auth provider for flow tests. Mirrors Supabase's enumeration-safe behaviour. */
export class FakeAuthProvider implements AuthProvider {
  readonly users = new Map<string, { id: string; password: string; confirmed: boolean }>();
  current: AuthUser | null = null;
  resetRequests: string[] = [];

  seed(email: string, password: string, id: string, confirmed = true) {
    this.users.set(email.toLowerCase(), { id, password, confirmed });
  }

  async signUp(input: { email: string; password: string; redirectTo: string }): Promise<AuthResult<{ userId: string | null; needsConfirmation: boolean }>> {
    const key = input.email.toLowerCase();
    if (this.users.has(key)) return { ok: false, code: "email_taken", message: "" };
    const id = crypto.randomUUID();
    this.users.set(key, { id, password: input.password, confirmed: false });
    return { ok: true, value: { userId: id, needsConfirmation: true } };
  }

  async signInWithPassword(input: { email: string; password: string }): Promise<AuthResult<AuthUser>> {
    const u = this.users.get(input.email.toLowerCase());
    if (!u || u.password !== input.password) return { ok: false, code: "invalid_credentials", message: "Incorrect email or password." };
    if (!u.confirmed) return { ok: false, code: "email_not_confirmed", message: "Confirm your email first." };
    this.current = { id: u.id, email: input.email.toLowerCase(), emailConfirmed: true };
    return { ok: true, value: this.current };
  }

  async signOut() {
    this.current = null;
  }

  async requestPasswordReset(input: { email: string }): Promise<AuthResult> {
    this.resetRequests.push(input.email);
    return { ok: true, value: undefined };
  }

  async updatePassword(input: { password: string }): Promise<AuthResult> {
    if (!this.current) return { ok: false, code: "no_session", message: "Open the reset link from your email first." };
    const u = this.users.get(this.current.email);
    if (u) u.password = input.password;
    return { ok: true, value: undefined };
  }

  async getUser() {
    return this.current;
  }
}
