import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/modules/admin/session";

import { LoginForm } from "./_form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-medium text-ink">Kesa Admin</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to manage your store</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-8 shadow-(--shadow-float)">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-ink-subtle">
          Access restricted to authorised staff only.
        </p>
      </div>
    </div>
  );
}
