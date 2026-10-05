"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Footer newsletter capture. The submit handler is a stub until the consent
 * and email modules exist; it never pretends the signup succeeded.
 */
export function NewsletterForm() {
  const [email, setEmail] = React.useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast("Newsletter signup is not connected yet", { description: "Consent and email modules arrive in Phase 2." });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <Label htmlFor="newsletter-email" className="sr-only">
        Email address
      </Label>
      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Your email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          Join
        </Button>
      </div>
      <p className="type-small text-ink-subtle">New arrivals and journal stories. No spam, unsubscribe any time.</p>
    </form>
  );
}
