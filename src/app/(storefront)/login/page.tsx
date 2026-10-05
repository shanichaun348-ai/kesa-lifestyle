import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthPage } from "@/components/auth/auth-page";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null);
  if (await getSessionUser()) redirect(next);
  const linkError = sp.error === "link";

  return (
    <AuthPage eyebrow="Account" title="Sign in" intro="Your orders, addresses and wishlist in one place.">
      {linkError ? (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>That link did not work</AlertTitle>
          <AlertDescription>It may have expired or already been used. Request a new one below.</AlertDescription>
        </Alert>
      ) : null}
      <LoginForm next={next} />
    </AuthPage>
  );
}
