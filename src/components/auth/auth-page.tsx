import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Container } from "@/components/storefront/container";
import { publicEnv } from "@/lib/env";

/** Shared chrome for sign-in, register and password pages. */
export function AuthPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string | undefined; children: React.ReactNode }) {
  const configured = Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <Container className="pt-10 pb-24">
      <div className="mx-auto max-w-md">
        <p className="type-eyebrow text-ink-subtle">{eyebrow}</p>
        <h1 className="type-h1 mt-2">{title}</h1>
        {intro ? <p className="type-body mt-3 text-ink-muted">{intro}</p> : null}
        <div className="mt-8">
          {configured ? (
            children
          ) : (
            <Alert variant="warning">
              <AlertTitle>Accounts are not available on this environment</AlertTitle>
              <AlertDescription>Supabase is not configured. Guest checkout still works.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Container>
  );
}
