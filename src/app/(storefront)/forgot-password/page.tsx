import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthPage eyebrow="Account" title="Reset your password" intro="Enter your email and we will send a link to choose a new password.">
      <ForgotPasswordForm />
    </AuthPage>
  );
}
