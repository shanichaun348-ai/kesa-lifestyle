import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckoutForm, type RetryPayment } from "@/components/checkout/checkout-form";
import { Container } from "@/components/storefront/container";
import { publicEnv } from "@/lib/env";
import { getSessionUserId } from "@/lib/auth/session";
import { getAccessibleOrderNumbers } from "@/modules/cart/cookies";
import { getCartContext } from "@/modules/cart/server";
import { getCheckoutService } from "@/modules/checkout/server";
import { getDb } from "@/db/client";
import { loadStoreSettings } from "@/modules/settings/store-settings";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Checkout. Server-rendered with the live bag; the form re-quotes totals on
 * the server as choices change. `?retry=KL-…` reopens payment for an order
 * placed in this browser that is still awaiting payment.
 */
export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const searchParams = await props.searchParams;
  const ctx = await getCartContext();

  if (!ctx.configured) {
    return (
      <Container className="pt-10 pb-24">
        <div className="mx-auto max-w-xl">
          <h1 className="type-h1">Checkout</h1>
          <Alert variant="warning" className="mt-6">
            <AlertTitle>Checkout is unavailable on this environment</AlertTitle>
            <AlertDescription>The store database is not configured. See the README to run Supabase locally and seed it.</AlertDescription>
          </Alert>
          <Button variant="secondary" className="mt-6" asChild>
            <Link href="/cart/">Back to bag</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const retryNumber = typeof searchParams.retry === "string" ? searchParams.retry : null;
  let retry: RetryPayment | undefined;
  if (retryNumber && /^KL-\d+$/.test(retryNumber)) {
    const service = getCheckoutService();
    const [found, profileId, accessible] = await Promise.all([service?.getOrderByNumber(retryNumber) ?? null, getSessionUserId(), getAccessibleOrderNumbers()]);
    const allowed = found && ((profileId && found.order.profileId === profileId) || accessible.includes(retryNumber));
    if (found && allowed && ["pending_payment", "payment_failed"].includes(found.order.status) && found.payment?.providerOrderId) {
      retry = {
        orderNumber: found.order.orderNumber,
        providerOrderId: found.payment.providerOrderId,
        amountPaise: found.order.totalPaise,
        email: found.order.guestEmail ?? "",
        phone: found.order.guestPhone ?? "",
      };
    }
  }

  const cartRow = await ctx.service.resolve({ token: ctx.token, profileId: ctx.profileId, create: false });
  const cart = await ctx.service.getView(cartRow?.id ?? null, { profileId: ctx.profileId });
  if (cart.lines.length === 0 && !retry) redirect("/cart/");

  const settings = await loadStoreSettings(getDb());

  return (
    <Container className="pt-6 pb-16 lg:pb-24">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="type-h1">Checkout</h1>
        <Link href="/cart/" className="type-small text-brand underline underline-offset-4">
          Edit bag
        </Link>
      </div>
      <CheckoutForm initialCart={cart} razorpayKeyId={publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null} codEnabled={settings.cod.enabled} retry={retry} />
    </Container>
  );
}
