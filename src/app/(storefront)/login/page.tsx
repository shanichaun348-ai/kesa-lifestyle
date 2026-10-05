import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Honest placeholder until customer accounts ship (email code sign-in,
 * docs/13 Phase 2). Guest checkout is fully available; a guest cart merges
 * into the account cart automatically once sign-in exists.
 */
export default function LoginPage() {
  return (
    <Container className="pt-10 pb-24">
      <div className="mx-auto max-w-md">
        <p className="type-eyebrow text-ink-subtle">Account</p>
        <h1 className="type-h1 mt-2">Sign in</h1>
        <Alert variant="info" className="mt-6">
          <AlertTitle>Accounts are coming soon</AlertTitle>
          <AlertDescription>Sign-in with an email code is part of the next release. You can check out as a guest today; your order confirmation and tracking are sent by email.</AlertDescription>
        </Alert>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/checkout/">Continue as guest</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
