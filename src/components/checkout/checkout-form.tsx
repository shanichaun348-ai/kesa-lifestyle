"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/components/cart/cart-provider";
import { Price } from "@/components/storefront/price";
import { quoteCartAction } from "@/modules/cart/actions";
import type { CartView } from "@/modules/cart/service";
import { confirmRazorpayPaymentAction, placeOrderAction } from "@/modules/checkout/actions";
import type { PlaceOrderFormInput } from "@/modules/checkout/schemas";
import { INDIAN_STATES } from "@/lib/india-states";
import { formatPaise } from "@/lib/money";
import type { DeliveryEstimate } from "@/modules/shipping/types";

import { openRazorpayCheckout, RazorpayDismissed, RazorpayFailed } from "./razorpay";

export type RetryPayment = { orderNumber: string; providerOrderId: string; amountPaise: number; email: string; phone: string };

type CheckoutFormProps = {
  initialCart: CartView;
  razorpayKeyId: string | null;
  codEnabled: boolean;
  retry?: RetryPayment | undefined;
};

type Address = { fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; stateCode: string; pincode: string };

const emptyAddress: Address = { fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", stateCode: "", pincode: "" };

type Stage = "form" | "placing" | "paying" | "confirming" | "abandoned" | "failed";

/**
 * Single-page checkout. The server owns every amount: whenever shipping,
 * payment, gift wrap or the destination state changes, totals are re-quoted
 * through a server action. Placing the order is idempotent per attempt.
 */
export function CheckoutForm({ initialCart, razorpayKeyId, codEnabled, retry }: CheckoutFormProps) {
  const router = useRouter();
  const cartCtx = useCart();
  const [cart, setCart] = React.useState<CartView>(initialCart);
  const [email, setEmail] = React.useState(retry?.email ?? "");
  const [phone, setPhone] = React.useState(retry?.phone.replace(/^\+91/, "") ?? "");
  const [address, setAddress] = React.useState<Address>(emptyAddress);
  const [shippingMethod, setShippingMethod] = React.useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = React.useState<"razorpay" | "cod">(razorpayKeyId ? "razorpay" : "cod");
  const [giftWrap, setGiftWrap] = React.useState(false);
  const [giftMessage, setGiftMessage] = React.useState("");
  const [stage, setStage] = React.useState<Stage>(retry ? "abandoned" : "form");
  const [message, setMessage] = React.useState<string | null>(retry ? "Your payment was not completed. You can try again below." : null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => crypto.randomUUID());
  const [pendingPayment, setPendingPayment] = React.useState<RetryPayment | null>(retry ?? null);
  const [codAvailable, setCodAvailable] = React.useState<boolean | null>(null);

  // Re-quote on the server whenever something that affects totals changes.
  const quoteKey = `${shippingMethod}|${paymentMethod}|${giftWrap}|${address.stateCode}`;
  React.useEffect(() => {
    let cancelled = false;
    void quoteCartAction({ shippingMethod, paymentMethod, giftWrap, destinationStateCode: address.stateCode || null }).then((result) => {
      if (!cancelled && result.ok) setCart(result.cart);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  // Pincode serviceability drives the COD option.
  React.useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(address.pincode)) return;
    let cancelled = false;
    fetch(`/api/delivery/estimate/?pincode=${address.pincode}`)
      .then(async (res) => (res.ok ? ((await res.json()) as DeliveryEstimate) : null))
      .then((estimate) => {
        if (cancelled || !estimate) return;
        setCodAvailable(estimate.serviceable ? estimate.codAvailable : false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [address.pincode]);

  function update<K extends keyof Address>(key: K, value: Address[K]) {
    setAddress((a) => ({ ...a, [key]: value }));
  }

  async function payWithRazorpay(payment: RetryPayment) {
    if (!razorpayKeyId) return;
    setStage("paying");
    try {
      const response = await openRazorpayCheckout({
        key: razorpayKeyId,
        amount: payment.amountPaise,
        currency: "INR",
        name: "Kesa Lifestyle",
        description: `Order ${payment.orderNumber}`,
        order_id: payment.providerOrderId,
        prefill: { email: payment.email, contact: payment.phone, name: address.fullName || undefined },
        notes: { order_number: payment.orderNumber },
        theme: { color: "#1b1917" },
      });
      setStage("confirming");
      const confirmed = await confirmRazorpayPaymentAction({
        orderNumber: payment.orderNumber,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      // Whatever the callback says, the confirmation page keeps polling the
      // server; the webhook and reconciliation job settle the final state.
      router.push(`/checkout/confirmation/${payment.orderNumber}/`);
      if (!confirmed.ok) setMessage(confirmed.message);
    } catch (error) {
      if (error instanceof RazorpayDismissed) {
        setStage("abandoned");
        setMessage("The payment window was closed before the payment completed. Your order is reserved for a few minutes; you can try again.");
      } else {
        setStage("failed");
        setMessage(error instanceof RazorpayFailed ? error.message : "The payment did not go through. You can try again.");
      }
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});
    setStage("placing");

    const input: PlaceOrderFormInput = {
      idempotencyKey,
      contact: { email, phone },
      shippingAddress: { ...address, line2: address.line2 || undefined, landmark: address.landmark || undefined, stateCode: address.stateCode as PlaceOrderFormInput["shippingAddress"]["stateCode"] },
      billingSameAsShipping: true,
      shippingMethod,
      paymentMethod,
      giftWrap,
      giftMessage: giftWrap && giftMessage ? giftMessage : undefined,
      pincodeCodAvailable: codAvailable,
    };

    const result = await placeOrderAction(input);
    if (!result.ok) {
      setStage("form");
      setMessage(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      // A failed attempt may have created and cancelled an order; a fresh key keeps retries clean.
      setIdempotencyKey(crypto.randomUUID());
      return;
    }

    const placed = result.result;
    if (placed.payment) {
      const payment: RetryPayment = { orderNumber: placed.orderNumber, providerOrderId: placed.payment.providerOrderId, amountPaise: placed.payment.amountPaise, email, phone: `+91${phone}` };
      setPendingPayment(payment);
      await payWithRazorpay(payment);
      return;
    }
    await cartCtx.refresh();
    router.push(`/checkout/confirmation/${placed.orderNumber}/`);
  }

  const p = cart.pricing;
  const busy = stage === "placing" || stage === "paying" || stage === "confirming";
  const err = (key: string) => fieldErrors[key];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-10" noValidate aria-busy={busy}>
        {message ? (
          <Alert variant={stage === "failed" || stage === "form" ? "danger" : "warning"}>
            <AlertTitle>{stage === "abandoned" ? "Payment not completed" : "Please check"}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
            {pendingPayment && (stage === "abandoned" || stage === "failed") ? (
              <div className="col-span-full mt-3">
                <Button type="button" onClick={() => void payWithRazorpay(pendingPayment)}>
                  Retry payment for {pendingPayment.orderNumber}
                </Button>
              </div>
            ) : null}
          </Alert>
        ) : null}

        <section aria-labelledby="contact-title" className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <h2 id="contact-title" className="type-h3">
              Contact
            </h2>
            <Link href="/login/" className="type-small text-brand underline underline-offset-4">
              Have an account? Sign in
            </Link>
          </div>
          <FieldGroup>
            <Field data-invalid={err("contact.email") ? "true" : undefined}>
              <FieldLabel htmlFor="co-email">Email</FieldLabel>
              <Input id="co-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(err("contact.email"))} />
              <FieldDescription>Order updates go here.</FieldDescription>
              {err("contact.email") ? <FieldError>{err("contact.email")}</FieldError> : null}
            </Field>
            <Field data-invalid={err("contact.phone") ? "true" : undefined}>
              <FieldLabel htmlFor="co-phone">Mobile number</FieldLabel>
              <div className="flex">
                <span className="inline-flex h-11 items-center rounded-l-sm border border-r-0 border-line-strong bg-surface-muted px-3 text-sm text-ink-muted">+91</span>
                <Input id="co-phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="rounded-l-none" aria-invalid={Boolean(err("contact.phone"))} />
              </div>
              {err("contact.phone") ? <FieldError>{err("contact.phone")}</FieldError> : null}
            </Field>
          </FieldGroup>
        </section>

        <section aria-labelledby="address-title" className="flex flex-col gap-4">
          <h2 id="address-title" className="type-h3">
            Delivery address
          </h2>
          <FieldGroup>
            <Field data-invalid={err("shippingAddress.fullName") ? "true" : undefined}>
              <FieldLabel htmlFor="co-name">Full name</FieldLabel>
              <Input id="co-name" autoComplete="name" required value={address.fullName} onChange={(e) => update("fullName", e.target.value)} />
              {err("shippingAddress.fullName") ? <FieldError>{err("shippingAddress.fullName")}</FieldError> : null}
            </Field>
            <Field data-invalid={err("shippingAddress.phone") ? "true" : undefined}>
              <FieldLabel htmlFor="co-addr-phone">Phone for delivery</FieldLabel>
              <Input id="co-addr-phone" inputMode="numeric" maxLength={10} required value={address.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" />
              {err("shippingAddress.phone") ? <FieldError>{err("shippingAddress.phone")}</FieldError> : null}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={err("shippingAddress.pincode") ? "true" : undefined}>
                <FieldLabel htmlFor="co-pincode">Pincode</FieldLabel>
                <Input id="co-pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} required value={address.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} />
                {err("shippingAddress.pincode") ? <FieldError>{err("shippingAddress.pincode")}</FieldError> : null}
              </Field>
              <Field data-invalid={err("shippingAddress.city") ? "true" : undefined}>
                <FieldLabel htmlFor="co-city">City</FieldLabel>
                <Input id="co-city" autoComplete="address-level2" required value={address.city} onChange={(e) => update("city", e.target.value)} />
                {err("shippingAddress.city") ? <FieldError>{err("shippingAddress.city")}</FieldError> : null}
              </Field>
            </div>
            <Field data-invalid={err("shippingAddress.stateCode") ? "true" : undefined}>
              <FieldLabel htmlFor="co-state">State</FieldLabel>
              <Select value={address.stateCode} onValueChange={(v) => update("stateCode", v)}>
                <SelectTrigger id="co-state" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("shippingAddress.stateCode") ? <FieldError>Select your state.</FieldError> : null}
            </Field>
            <Field data-invalid={err("shippingAddress.line1") ? "true" : undefined}>
              <FieldLabel htmlFor="co-line1">Address</FieldLabel>
              <Input id="co-line1" autoComplete="address-line1" required value={address.line1} onChange={(e) => update("line1", e.target.value)} placeholder="Flat, building, street" />
              {err("shippingAddress.line1") ? <FieldError>{err("shippingAddress.line1")}</FieldError> : null}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="co-line2">Area (optional)</FieldLabel>
                <Input id="co-line2" autoComplete="address-line2" value={address.line2} onChange={(e) => update("line2", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="co-landmark">Landmark (optional)</FieldLabel>
                <Input id="co-landmark" value={address.landmark} onChange={(e) => update("landmark", e.target.value)} />
              </Field>
            </div>
          </FieldGroup>
        </section>

        <section aria-labelledby="shipping-title" className="flex flex-col gap-4">
          <h2 id="shipping-title" className="type-h3">
            Shipping
          </h2>
          <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as "standard" | "express")} aria-label="Shipping method">
            <Label className="flex min-h-11 items-center gap-3 text-sm">
              <RadioGroupItem value="standard" />
              Standard · 3–7 days · {p.shippingPaise === 0 && shippingMethod === "standard" ? "Free" : "Free over ₹999, else ₹79"}
            </Label>
            <Label className="flex min-h-11 items-center gap-3 text-sm">
              <RadioGroupItem value="express" />
              Express · 1–3 days in metros · +₹99
            </Label>
          </RadioGroup>
        </section>

        <section aria-labelledby="gift-title" className="flex flex-col gap-3">
          <h2 id="gift-title" className="type-h3">
            Gift options
          </h2>
          <Label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox checked={giftWrap} onCheckedChange={(v) => setGiftWrap(v === true)} />
            Gift wrap with a printed message (+₹49). Prices are hidden on the slip.
          </Label>
          {giftWrap ? (
            <Field>
              <FieldLabel htmlFor="co-gift">Gift message</FieldLabel>
              <Textarea id="co-gift" maxLength={200} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
              <FieldDescription>{200 - giftMessage.length} characters left.</FieldDescription>
            </Field>
          ) : null}
        </section>

        <section aria-labelledby="payment-title" className="flex flex-col gap-4">
          <h2 id="payment-title" className="type-h3">
            Payment
          </h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "razorpay" | "cod")} aria-label="Payment method">
            <Label className={`flex min-h-11 items-center gap-3 text-sm ${razorpayKeyId ? "" : "opacity-50"}`}>
              <RadioGroupItem value="razorpay" disabled={!razorpayKeyId} />
              UPI, cards, net banking, wallets {razorpayKeyId ? "" : "(not configured on this environment)"}
            </Label>
            <Label className={`flex min-h-11 items-center gap-3 text-sm ${codEnabled && codAvailable !== false ? "" : "opacity-50"}`}>
              <RadioGroupItem value="cod" disabled={!codEnabled || codAvailable === false} />
              Cash on delivery (+₹25){codAvailable === false ? " · not available for this pincode" : ""}
            </Label>
          </RadioGroup>
          <p className="type-small flex items-center gap-1.5 text-ink-subtle">
            <LockIcon className="size-3.5" aria-hidden="true" />
            Payments are processed by Razorpay. Card details never touch our servers.
          </p>
        </section>

        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!cart.checkoutReady || busy}>
          {paymentMethod === "cod" ? `Place order · ${formatPaise(p.totalPaise)}` : `Pay ${formatPaise(p.totalPaise)}`}
        </Button>
        {!cart.checkoutReady ? <p className="type-small text-danger">Some items in your bag need attention before you can check out.</p> : null}
      </form>

      <aside aria-label="Order summary" className="h-fit rounded-md border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="type-h3">Your order</h2>
        <ul className="mt-4 divide-y divide-line">
          {cart.lines.map((line) => (
            <li key={line.sku} className="flex gap-3 py-3">
              <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                {line.image.src ? <Image src={line.image.src} alt={line.image.alt} fill sizes="56px" unoptimized={line.image.unoptimized ?? false} className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-ink">{line.productName}</p>
                <p className="type-small text-ink-muted">
                  {line.optionLabel ? `${line.optionLabel} · ` : ""}Qty {line.quantity}
                </p>
              </div>
              <Price pricePaise={line.lineTotalPaise} size="sm" className="shrink-0" />
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="type-price">{formatPaise(p.subtotalPaise)}</dd>
          </div>
          {p.discountPaise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Discount{cart.coupon?.applied ? ` (${cart.coupon.code})` : ""}</dt>
              <dd className="type-price text-success">−{formatPaise(p.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="type-price">{p.shippingPaise === 0 ? "Free" : formatPaise(p.shippingPaise)}</dd>
          </div>
          {p.codFeePaise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Cash on delivery fee</dt>
              <dd className="type-price">{formatPaise(p.codFeePaise)}</dd>
            </div>
          ) : null}
          {p.giftWrapPaise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Gift wrap</dt>
              <dd className="type-price">{formatPaise(p.giftWrapPaise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="text-ink">Total</dt>
            <dd className="type-price">{formatPaise(p.totalPaise)}</dd>
          </div>
          <p className="type-small text-ink-subtle">
            Includes {formatPaise(p.taxPaise)} GST
            {p.taxBreakdown.splitKnown ? (p.taxBreakdown.igstPaise > 0 ? " (IGST)" : " (CGST + SGST)") : ""}.
          </p>
        </dl>
      </aside>
    </div>
  );
}
