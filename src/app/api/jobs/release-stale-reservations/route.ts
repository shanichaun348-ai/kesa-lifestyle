import { NextResponse, type NextRequest } from "next/server";

import { isAuthorisedJobRequest } from "@/lib/jobs/auth";
import { fetchRazorpayOrderPayments } from "@/lib/razorpay";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCheckoutService } from "@/modules/checkout/server";
import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import { getOrderRepository } from "@/modules/orders/queries";
import { reconcileStaleOrders } from "@/modules/orders/stale-orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled (every 15 minutes via GitHub Actions): cancel online orders
 * still unpaid after 30 minutes and release their stock, or mark them paid
 * when Razorpay shows a captured payment we never heard about. Falls back
 * to the legacy database service when Supabase is not configured.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorisedJobRequest(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const now = new Date();
    const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    const summary = await reconcileStaleOrders({
      repo: getOrderRepository(),
      // Without gateway keys nothing can be confirmed as paid, so every stale order is treated as unpaid.
      fetchPayments: razorpayConfigured ? fetchRazorpayOrderPayments : async () => [],
      notifyPaid: (order) => notifyOrderPaid(order),
      now,
    });
    console.log(JSON.stringify({ level: "info", event: "job", job: "stale-orders", ...summary, ts: now.toISOString() }));
    return NextResponse.json(summary);
  }

  const service = getCheckoutService();
  if (!service) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const result = await service.releaseExpiredReservations();
  return NextResponse.json(result);
}
