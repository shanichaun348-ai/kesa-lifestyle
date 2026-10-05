"use client";

import * as React from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatPaise } from "@/lib/money";

// ── Cart types (mirrors cart/store.ts CartLine) ───────────────────────────────

type CartLine = {
  sku: string;
  name: string;
  optionLabel?: string;
  unitPricePaise: number;
  quantity: number;
  image?: { src: string; alt: string };
};

const CART_STORAGE_KEY = "kesa:cart:v1";

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" && l !== null &&
        typeof (l as Record<string, unknown>).sku === "string" &&
        typeof (l as Record<string, unknown>).name === "string" &&
        typeof (l as Record<string, unknown>).unitPricePaise === "number" &&
        typeof (l as Record<string, unknown>).quantity === "number",
    );
  } catch {
    return [];
  }
}

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

type OrderSuccess = { orderId: string };

export function CheckoutForm() {
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = React.useState(false);

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
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [checkoutState, setCheckoutState] = React.useState<CheckoutState>("idle");
  const [orderSuccess, setOrderSuccess] = React.useState<OrderSuccess | null>(null);

  React.useEffect(() => {
    setCart(readCart());
    setCartLoaded(true);
  }, []);

  const clientSubtotal = cart.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);

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

    let orderData: { orderId: string; razorpayOrderId: string; razorpayKeyId: string; amount: number; currency: string };

    try {
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        toast.error((json.error as string) || "Could not create order. Please try again.");
        setCheckoutState("idle");
        return;
      }
      orderData = json as typeof orderData;
    } catch {
      toast.error("Network error. Please try again.");
      setCheckoutState("idle");
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

    const options: Record<string, unknown> = {
      key: orderData.razorpayKeyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.razorpayOrderId,
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
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json() as Record<string, unknown>;
          if (verifyRes.ok && verifyJson.success) {
            // Clear cart after successful payment.
            try { window.localStorage.removeItem(CART_STORAGE_KEY); } catch { /* ignore */ }
            setOrderSuccess({ orderId: orderData.orderId });
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

  if (!cartLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (checkoutState === "success" && orderSuccess) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <p className="type-eyebrow text-ink-subtle">Order confirmed</p>
        <h1 className="type-h1">Thank you for your order!</h1>
        <p className="text-ink-subtle">
          Your order <span className="font-medium text-ink">{orderSuccess.orderId}</span> has been placed. You will receive a confirmation on your email shortly.
        </p>
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

  return (
    <>
      <Toaster position="top-center" />
      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">

        {/* ── Left: customer + address ─────────────────────────────────── */}
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
        </div>

        {/* ── Right: order summary + coupon + pay ──────────────────────── */}
        <aside className="space-y-6">
          <section className="rounded-md border border-line-strong p-5 space-y-4">
            <h2 className="type-h3">Order summary</h2>
            <ul className="space-y-3">
              {cart.map((line) => (
                <li key={line.sku} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ink leading-snug">{line.name}</p>
                    {line.optionLabel && <p className="text-ink-subtle">{line.optionLabel}</p>}
                    <p className="text-ink-subtle">Qty: {line.quantity}</p>
                  </div>
                  <span className="shrink-0 font-medium text-ink">{formatPaise(line.unitPricePaise * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line pt-3 text-sm text-ink-subtle">
              <p>Estimated subtotal: <span className="font-medium text-ink">{formatPaise(clientSubtotal)}</span></p>
              <p className="mt-0.5 text-xs">Final price is confirmed by the server. Shipping and any discounts are applied at payment.</p>
            </div>
          </section>

          <section className="space-y-2">
            <Label htmlFor="coupon">Coupon code</Label>
            <Input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Optional" disabled={busy} />
          </section>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy} aria-busy={busy}>
            {busy ? <><Spinner className="size-4" /> Processing…</> : "Proceed to pay"}
          </Button>

          <p className="text-xs text-ink-subtle text-center">
            Payments powered by Razorpay. Your card details are never shared with us.
          </p>
        </aside>
      </form>
    </>
  );
}
