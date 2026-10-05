import { NextResponse, type NextRequest } from "next/server";

import { getCheckoutService } from "@/modules/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (docs/11 §7). The raw body is verified against the
 * webhook secret; events are idempotent on `X-Razorpay-Event-Id`. A 5xx is
 * returned only when processing failed after a valid signature, so Razorpay
 * retries; signature failures are 400 and are not retried.
 */
export async function POST(request: NextRequest) {
  const service = getCheckoutService();
  if (!service) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!signature || !eventId) return NextResponse.json({ error: "missing_headers" }, { status: 400 });

  const result = await service.handleWebhook({ eventId, rawBody, signature });
  return NextResponse.json({ ok: result.ok, outcome: result.outcome }, { status: result.status });
}
