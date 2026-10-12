import "server-only";

import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";
import { isSupabaseConfigured } from "@/lib/supabase";
import { resumeTokenSchema } from "@/modules/abandoned-cart/schemas";
import { unsubscribeCart } from "@/modules/abandoned-cart/store";

export const metadata: Metadata = { title: "Reminder preferences", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string }> };

/** One-click opt-out from bag reminders, linked from every reminder email. */
export default async function CartUnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const parsed = resumeTokenSchema.safeParse(token);
  const done = parsed.success && isSupabaseConfigured() ? await unsubscribeCart(parsed.data) : false;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="type-h2">{done ? "You won't hear from us about this bag" : "Nothing to update"}</h1>
        <p className="type-body mt-3 text-ink-muted">
          {done
            ? "We've stopped the reminders for this bag. Your items stay in your bag on this device if you'd like to come back to them."
            : "This link has already been used or has expired. You will not receive further reminders for it."}
        </p>
        <Button className="mt-8" asChild>
          <Link href="/cart/">Go to your bag</Link>
        </Button>
      </div>
    </Container>
  );
}
