"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { verifyAdminCredentials } from "@/modules/admin/auth";
import { auditLog } from "@/modules/admin/audit";
import { isRateLimited, recordFailedAttempt } from "@/modules/admin/rate-limit";
import { makeSession, setAdminSession, clearAdminSession, getAdminSession } from "@/modules/admin/session";

export type LoginState = { error: string } | null;

async function getClientIp(): Promise<string> {
  // x-forwarded-for may be a comma-separated list; take the leftmost entry.
  const hdrs = await headers();
  const xff = hdrs.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return hdrs.get("x-real-ip") ?? "unknown";
}

export async function signIn(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getClientIp();

  if (isRateLimited(ip)) {
    return { error: "Too many failed attempts. Please try again in 15 minutes." };
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    recordFailedAttempt(ip);
    return { error: "Email and password are required." };
  }

  const user = verifyAdminCredentials(email.trim(), password);
  if (!user) {
    const { allowed } = recordFailedAttempt(ip);
    // Log failed attempts for security monitoring (no session available yet).
    console.log(
      JSON.stringify({
        level: "warn",
        event: "admin_audit",
        action: "admin.login_failed",
        email: email.trim(),
        ip,
        ts: new Date().toISOString(),
      }),
    );
    if (!allowed) {
      return { error: "Too many failed attempts. Please try again in 15 minutes." };
    }
    return { error: "Invalid email or password." };
  }

  const session = makeSession(user);
  await setAdminSession(session);
  auditLog(session, "admin.login");

  redirect("/admin/");
}

export async function signOut(): Promise<void> {
  const session = await getAdminSession();
  if (session) auditLog(session, "admin.logout");
  await clearAdminSession();
  redirect("/admin/login/");
}
