"use client";

import * as React from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatPaise } from "@/lib/money";
import { allPurchasable, describeLineCheck, type LineCheck } from "@/modules/cart/availability";
import { useCart } from "@/modules/cart/use-cart";
import { useBagAvailability } from "@/modules/cart/use-bag-availability";
import { COD_FEE_PAISE, COD_FEE_WAIVER_PAISE, codAvailability, type PaymentMethod } from "@/modules/checkout/cod";

// ── Razorpay.js loader ────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.head.appendChild(script);
  });
}

// ── Indian states ─────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// ── Component ─────────────────────────────────────────────────────────────────

type CheckoutState = "idle" | "submitting" | "success";

type OrderSuccess = { orderId: string; orderNumber: number | null; paymentMethod: PaymentMethod; amountPaise: number | null };

type OrderResponse =
  | { paymentMethod: "cod"; orderId: string; orderNumber: number | null; amount: number }
  | { paymentMethod?: "razorpay"; orderId: string; razorpayOrderId: string; razorpayKeyId: string; amount: number; currency: string };

type CheckoutFormProps = {
  /** Code advertised in the announcement strip, offered as a one-tap hint. */
  suggestedCode?: string | undefined;
};

export function CheckoutForm({ suggestedCode }: CheckoutFormProps = {}) {
  const bag = useCart();
  const cart = bag.lines;
  // What the catalogue says about each line today: price, stock, or gone.
  const availability = useBagAvailability(cart);
  // A line the server refused when the order was placed (e.g. sold out a moment ago).
  const [refused, setRefused] = React.useState<{ sku: string; check: LineCheck } | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addrName, setAddrName] = React.useState("");
  const [addrPhone, setAddrPhone] = React.useState("");
  const [line1, setLine1] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [couponCode, setCouponCode] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("razorpay");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [checkoutState, setCheckoutState] = React.useState<CheckoutState>("idle");
  const [orderSuccess, setOrderSuccess] = React.useState<OrderSuccess | null>(null);

  // Merge the live check with anything the server refused since; a line is only
  // judged once the catalogue has answered for it.
  const checks = React.useMemo(() => {
    const merged = new Map(availability.checks);
    if (refused && cart.some((l) => l.sku === refused.sku)) merged.set(refused.sku, refused.check);
    return merged;
  }, [availability.checks, refused, cart]);
  const purchasable = allPurchasable(checks);
  const unitPrice = (line: { sku: string; unitPricePaise: number }) => {
    const check = checks.get(line.sku);
    return check?.kind === "ok" ? check.unitPricePaise : line.unitPricePaise;
  };
  const clientSubtotal = cart.reduce((s, l) => s + unitPrice(l) * l.quantity, 0);

  // Preview only — the server re-derives eligibility and the fee from its own pricing.
  const cod = codAvailability(clientSubtotal);
  // If the bag changes and COD stops being available, fall back to online payment without a re-render loop.
  const effectiveMethod: PaymentMethod = paymentMethod === "cod" && cod.allowed ? "cod" : "razorpay";
  const codSelected = effectiveMethod === "cod";

  function removeLine(sku: string) {
    bag.remove(sku);
    setRefused((r) => (r?.sku === sku ? null : r));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Full name is required.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Valid email required.";
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim())) errors.phone = "Valid 10-digit mobile number required.";
    if (!addrName.trim()) errors.addrName = "Recipient name is required.";
    if (!addrPhone.trim()) errors.addrPhone = "Address phone is required.";
    if (!line1.trim()) errors.line1 = "Address line 1 is required.";
    if (!city.trim()) errors.city = "City is required.";
    if (!state.trim()) errors.state = "State is required.";
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) errors.pincode = "Valid 6-digit pincode required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setCheckoutState("submitting");

    // Send only trusted identifiers — never prices.
    const orderBody = {
      lines: cart.map((l) => ({ sku: l.sku, quantity: l.quantity })),
      ...(couponCode.trim() && { couponCode: couponCode.trim() }),
      paymentMethod: effectiveMethod,
      customer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      shippingAddress: {
        name: addrName.trim(),
        phone: addrPhone.trim(),
        line1: line1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
    };

    let orderData: OrderResponse;

    try {
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        // The server names the SKU it refused; point at the line instead of echoing the code.
        const line = typeof json.sku === "string" ? cart.find((l) => l.sku === json.sku) : undefined;
        if (line) {
          const check: LineCheck = json.code === "OUT_OF_STOCK" || res.status === 409 ? { kind: "sold_out" } : { kind: "unavailable" };
          setRefused({ sku: line.sku, check });
          toast.error(`“${line.name}” ${check.kind === "sold_out" ? "just sold out" : "is no longer available"}. Remove it from your bag to continue.`);
        } else {
          if (json.code === "COD_UNAVAILABLE") setPaymentMethod("razorpay");
          toast.error((json.error as string) || "Could not create order. Please try again.");
        }
        setCheckoutState("idle");
        return;
      }
      orderData = json as unknown as OrderResponse;
    } catch {
      toast.error("Network error. Please try again.");
      setCheckoutState("idle");
      return;
    }

    // Cash on delivery: the order is confirmed as soon as it is placed.
    if (orderData.paymentMethod === "cod") {
      bag.clear();
      setOrderSuccess({ orderId: orderData.orderId, orderNumber: orderData.orderNumber, paymentMethod: "cod", amountPaise: orderData.amount });
      setCheckoutState("success");
      return;
    }

    // Load and open Razorpay checkout.
    try {
      await loadRazorpayScript();
    } catch {
      toast.error("Could not load payment gateway. Please try again.");
      setCheckoutState("idle");
      return;
    }

    const paid = orderData;
    const options: Record<string, unknown> = {
      key: paid.razorpayKeyId,
      amount: paid.amount,
      currency: paid.currency,
      order_id: paid.razorpayOrderId,
      name: "Kesa Lifestyle",
      description: "Jewellery Order",
      prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
      theme: { color: "#1a1a1a" },
      handler: async (response: Record<string, string>) => {
        try {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: paid.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json() as Record<string, unknown>;
          if (verifyRes.ok && verifyJson.success) {
            // Clear cart after successful payment.
            bag.clear();
            setOrderSuccess({
              orderId: paid.orderId,
              orderNumber: typeof verifyJson.orderNumber === "number" ? verifyJson.orderNumber : null,
              paymentMethod: "razorpay",
              amountPaise: paid.amount,
            });
            setCheckoutState("success");
          } else {
            toast.error("Payment verification failed. Contact support with your order reference.");
            setCheckoutState("idle");
          }
        } catch {
          toast.error("Verification error. Contact support with your order reference.");
          setCheckoutState("idle");
        }
      },
      modal: {
        ondismiss: () => {
          setCheckoutState("idle");
        },
      },
    };

    if (!window.Razorpay) {
      toast.error("Payment gateway unavailable. Please try again.");
      setCheckoutState("idle");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new window.Razorpay(options as any).open();
  }

  if (checkoutState === "success" && orderSuccess) {
    const ref = orderSuccess.orderNumber ? `KL-${orderSuccess.orderNumber}` : orderSuccess.orderId;
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <p className="type-eyebrow text-ink-subtle">Order confirmed</p>
        <h1 className="type-h1">Thank you for your order!</h1>
        <p className="text-ink-subtle">
          Your order <span className="font-medium text-ink">{ref}</span> has been placed. A confirmation email is on its way to <span className="font-medium text-ink">{email.trim()}</span>.
        </p>
        {orderSuccess.paymentMethod === "cod" && orderSuccess.amountPaise !== null ? (
          <p className="rounded-md border border-line bg-surface p-4 text-sm text-ink">
            Please keep <span className="font-medium">{formatPaise(orderSuccess.amountPaise)}</span> ready to pay in cash when your order arrives. We&rsquo;ll message you when it ships.
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button variant="primary" asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="type-h1">Your bag is empty</h1>
        <p className="text-ink-subtle">Add some jewellery before checking out.</p>
        <Button variant="primary" asChild>
          <Link href="/collections/">Browse collections</Link>
        </Button>
      </div>
    );
  }

  const busy = checkoutState === "submitting";
  const codFeeLabel = cod.allowed ? (cod.feePaise === 0 ? "free on this order" : `+${formatPaise(cod.feePaise)}`) : "unavailable";

  return (
    <>
      <Toaster position="top-center" />
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">

        {/* ── Left: customer + address + payment ───────────────────────── */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="type-h3">Contact information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!fieldErrors.name} disabled={busy} />
                {fieldErrors.name && <p className="text-sm text-danger">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!fieldErrors.email} disabled={busy} />
                {fieldErrors.email && <p className="text-sm text-danger">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="10-digit mobile" aria-invalid={!!fieldErrors.phone} disabled={busy} />
                {fieldErrors.phone && <p className="text-sm text-danger">{fieldErrors.phone}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="type-h3">Shipping address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addrName">Recipient name</Label>
                <Input id="addrName" value={addrName} onChange={(e) => setAddrName(e.target.value)} autoComplete="shipping name" aria-invalid={!!fieldErrors.addrName} disabled={busy} />
                {fieldErrors.addrName && <p className="text-sm text-danger">{fieldErrors.addrName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addrPhone">Phone (for delivery)</Label>
                <Input id="addrPhone" type="tel" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} autoComplete="shipping tel" placeholder="10-digit" aria-invalid={!!fieldErrors.addrPhone} disabled={busy} />
                {fieldErrors.addrPhone && <p className="text-sm text-danger">{fieldErrors.addrPhone}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" value={line1} onChange={(e) => setLine1(e.target.value)} autoComplete="shipping address-line1" aria-invalid={!!fieldErrors.line1} disabled={busy} />
                {fieldErrors.line1 && <p className="text-sm text-danger">{fieldErrors.line1}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="shipping address-level2" aria-invalid={!!fieldErrors.city} disabled={busy} />
                {fieldErrors.city && <p className="text-sm text-danger">{fieldErrors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={busy}
                  className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-60"
                  aria-invalid={!!fieldErrors.state}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {fieldErrors.state && <p className="text-sm text-danger">{fieldErrors.state}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} autoComplete="shipping postal-code" placeholder="6 digits" maxLength={6} aria-invalid={!!fieldErrors.pincode} disabled={busy} />
                {fieldErrors.pincode && <p className="text-sm text-danger">{fieldErrors.pincode}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="type-h3">Payment</h2>
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="sr-only">Payment method</legend>
              <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${!codSelected ? "border-ink bg-surface" : "border-line hover:border-ink-muted"}`}>
                <input type="radio" name="paymentMethod" value="razorpay" checked={!codSelected} onChange={() => setPaymentMethod("razorpay")} className="mt-1 accent-ink" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">Pay online</span>
                  <span className="type-small text-ink-muted">UPI, cards, netbanking and wallets via Razorpay.</span>
                </span>
              </label>
              <label className={`flex items-start gap-3 rounded-md border p-4 transition-colors ${!cod.allowed ? "cursor-not-allowed opacity-60" : codSelected ? "cursor-pointer border-ink bg-surface" : "cursor-pointer border-line hover:border-ink-muted"}`}>
                <input type="radio" name="paymentMethod" value="cod" checked={codSelected} onChange={() => setPaymentMethod("cod")} disabled={!cod.allowed} className="mt-1 accent-ink" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">Cash on delivery <span className="font-normal text-ink-muted">({codFeeLabel})</span></span>
                  <span className="type-small text-ink-muted">
                    {cod.allowed
                      ? `Pay in cash when your order arrives. ${formatPaise(COD_FEE_PAISE)} handling fee, free on orders of ${formatPaise(COD_FEE_WAIVER_PAISE)} or more.`
                      : cod.reason}
                  </span>
                </span>
              </label>
            </fieldset>
          </section>
        </div>

        {/* ── Right: order summary + coupon + pay ──────────────────────── */}
        <aside className="space-y-6">
          <section className="rounded-md border border-line-strong p-5 space-y-4">
            <h2 className="type-h3">Order summary</h2>
            <ul className="space-y-3">
              {cart.map((line) => {
                const check = checks.get(line.sku);
                const problem = check ? describeLineCheck(check) : null;
                return (
                  <li key={line.sku} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className={`font-medium leading-snug ${problem ? "text-ink-muted line-through" : "text-ink"}`}>{line.name}</p>
                      {line.optionLabel && <p className="text-ink-subtle">{line.optionLabel}</p>}
                      <p className="text-ink-subtle">Qty: {line.quantity}</p>
                      {problem ? (
                        <p className="mt-1 text-danger">
                          {problem}{" "}
                          <button type="button" onClick={() => removeLine(line.sku)} disabled={busy} className="underline underline-offset-4 hover:text-ink">
                            Remove
                          </button>
                        </p>
                      ) : null}
                    </div>
                    <span className={`shrink-0 font-medium ${problem ? "text-ink-muted line-through" : "text-ink"}`}>{formatPaise(unitPrice(line) * line.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            {!purchasable ? (
              <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-ink">
                Some pieces in your bag can no longer be bought. Remove them to continue.
              </p>
            ) : null}
            <div className="border-t border-line pt-3 text-sm text-ink-subtle space-y-0.5">
              <p>Estimated subtotal: <span className="font-medium text-ink">{formatPaise(clientSubtotal)}</span></p>
              {codSelected && cod.allowed ? (
                <p>Cash on delivery fee: <span className="font-medium text-ink">{cod.feePaise === 0 ? "Free" : formatPaise(cod.feePaise)}</span></p>
              ) : null}
              <p className="mt-0.5 text-xs">Final price is confirmed by the server. Shipping and any discounts are applied at {codSelected ? "order confirmation" : "payment"}.</p>
            </div>
          </section>

          <section className="space-y-2">
            <Label htmlFor="coupon">Coupon code</Label>
            <Input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Optional" disabled={busy} />
            {suggestedCode && couponCode.trim().toUpperCase() !== suggestedCode ? (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                <span>
                  Have a code? Try <span className="font-mono font-medium text-ink">{suggestedCode}</span>
                </span>
                <button type="button" onClick={() => setCouponCode(suggestedCode)} disabled={busy} className="text-brand underline underline-offset-4 hover:no-underline disabled:opacity-50">
                  Apply
                </button>
              </p>
            ) : null}
            <p className="text-xs text-ink-subtle">The discount is confirmed on the next step.</p>
          </section>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || availability.checking || !purchasable} aria-busy={busy || availability.checking}>
            {busy ? <><Spinner className="size-4" /> {codSelected ? "Placing order…" : "Processing…"}</> : availability.checking ? <><Spinner className="size-4" /> Checking your bag…</> : codSelected ? "Place order" : "Proceed to pay"}
          </Button>

          <p className="text-xs text-ink-subtle text-center">
            {codSelected ? "You pay the courier in cash when your order is delivered." : "Payments powered by Razorpay. Your card details are never shared with us."}
          </p>
        </aside>
      </form>
    </>
  );
}
