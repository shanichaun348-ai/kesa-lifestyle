import "server-only";

/**
 * Razorpay REST API client — uses native fetch with HTTP Basic Auth.
 * No Razorpay npm package required.
 *
 * Env vars:
 *   RAZORPAY_KEY_ID      — public key id from the Razorpay dashboard
 *   RAZORPAY_KEY_SECRET  — private key (never sent to the client)
 */

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;       // paise
  currency: string;
  receipt: string;
  status: string;
};

function buildAuthHeader(keyId: string, keySecret: string): string {
  const credentials = Buffer.from(`${keyId}:${keySecret}`, "utf-8").toString("base64");
  return `Basic ${credentials}`;
}

export function requireRazorpayConfig(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.");
  }
  return { keyId, keySecret };
}

/** The public key ID — safe to send to the browser. */
export function getRazorpayKeyId(): string {
  return requireRazorpayConfig().keyId;
}

/**
 * Create a Razorpay order server-side.
 * The `amount` MUST be the server-calculated totalPaise — never from the client.
 */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>,
): Promise<RazorpayOrder> {
  const { keyId, keySecret } = requireRazorpayConfig();
  const body: Record<string, unknown> = {
    amount: amountPaise,
    currency: "INR",
    receipt,
    // Capture automatically on authorisation, so a successful checkout never
    // sits as "authorized" and the verify route can insist on "captured".
    payment_capture: 1,
  };
  if (notes) body.notes = notes;

  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(keyId, keySecret),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    // Never forward Razorpay's error body — it may contain config details.
    throw new Error(`Razorpay order creation failed (HTTP ${status}).`);
  }

  const data = (await res.json()) as RazorpayOrder;
  return data;
}

/**
 * Fetch an existing Razorpay order — used to verify amount after payment.
 */
export async function fetchRazorpayOrder(razorpayOrderId: string): Promise<RazorpayOrder> {
  const { keyId, keySecret } = requireRazorpayConfig();

  const res = await fetch(`${RAZORPAY_BASE}/orders/${razorpayOrderId}`, {
    headers: { Authorization: buildAuthHeader(keyId, keySecret) },
  });

  if (!res.ok) {
    throw new Error(`Razorpay order fetch failed (HTTP ${res.status}).`);
  }

  return (await res.json()) as RazorpayOrder;
}

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number; // paise
  currency: string;
  /** created | authorized | captured | refunded | failed */
  status: string;
  captured: boolean;
};

/** Fetch one payment, used to confirm the money was actually captured before an order is marked paid. */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const { keyId, keySecret } = requireRazorpayConfig();
  const res = await fetch(`${RAZORPAY_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: buildAuthHeader(keyId, keySecret) },
  });
  if (!res.ok) throw new Error(`Razorpay payment fetch failed (HTTP ${res.status}).`);
  return (await res.json()) as RazorpayPayment;
}

/** Every payment attempt made against a Razorpay order (the stale-order job uses this). */
export async function fetchRazorpayOrderPayments(razorpayOrderId: string): Promise<RazorpayPayment[]> {
  const { keyId, keySecret } = requireRazorpayConfig();
  const res = await fetch(`${RAZORPAY_BASE}/orders/${encodeURIComponent(razorpayOrderId)}/payments`, {
    headers: { Authorization: buildAuthHeader(keyId, keySecret) },
  });
  if (!res.ok) throw new Error(`Razorpay order payments fetch failed (HTTP ${res.status}).`);
  const data = (await res.json()) as { items?: RazorpayPayment[] };
  return data.items ?? [];
}

/** Capture an authorised payment for exactly `amountPaise`. Idempotent on Razorpay's side for already-captured payments. */
export async function captureRazorpayPayment(paymentId: string, amountPaise: number): Promise<RazorpayPayment> {
  const { keyId, keySecret } = requireRazorpayConfig();
  const res = await fetch(`${RAZORPAY_BASE}/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: buildAuthHeader(keyId, keySecret) },
    body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
  });
  if (!res.ok) throw new Error(`Razorpay capture failed (HTTP ${res.status}).`);
  return (await res.json()) as RazorpayPayment;
}
