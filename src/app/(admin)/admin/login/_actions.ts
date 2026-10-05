"use server";

import { redirect } from "next/navigation";

import { verifyAdminCredentials } from "@/modules/admin/auth";
import { auditLog } from "@/modules/admin/audit";
import { makeSession, setAdminSession, clearAdminSession, getAdminSession } from "@/modules/admin/session";

export type LoginState = { error: string } | null;

export async function signIn(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email and password are required." };
  }

  const user = verifyAdminCredentials(email.trim(), password);
  if (!user) {
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
