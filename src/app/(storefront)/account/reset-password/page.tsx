import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthPage } from "@/components/auth/auth-page";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Reached from the emailed recovery link (which creates a session) or from a signed-in account. */
export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <AuthPage eyebrow="Account" title="Choose a new password">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert variant="warning">
          <AlertTitle>Open the link from your email</AlertTitle>
          <AlertDescription>This page only works from the password reset link we emailed you, or while signed in.</AlertDescription>
        </Alert>
      )}
    </AuthPage>
  );
}
