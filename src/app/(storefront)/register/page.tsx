import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-page";
import { RegisterForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null);
  if (await getSessionUser()) redirect(next);
  return (
    <AuthPage eyebrow="Account" title="Create an account" intro="Faster checkout, order tracking and a wishlist that follows you.">
      <RegisterForm next={next} />
    </AuthPage>
  );
}
