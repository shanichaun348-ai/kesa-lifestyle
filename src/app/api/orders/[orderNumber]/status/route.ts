import { NextResponse, type NextRequest } from "next/server";

import { getSessionUserId } from "@/lib/auth/session";
import { getAccessibleOrderNumbers } from "@/modules/cart/cookies";
import { getCheckoutService } from "@/modules/checkout/server";

export const dynamic = "force-dynamic";

/** Confirmation-page polling while a payment settles. Guests may read only orders placed in this browser. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/orders/[orderNumber]/status">) {
  const { orderNumber } = await context.params;
  if (!/^KL-\d+$/.test(orderNumber)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const service = getCheckoutService();
  if (!service) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [found, profileId, accessible] = await Promise.all([service.getOrderByNumber(orderNumber), getSessionUserId(), getAccessibleOrderNumbers()]);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const allowed = (profileId !== null && found.order.profileId === profileId) || accessible.includes(orderNumber);
  if (!allowed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    { orderNumber, status: found.order.status, paymentStatus: found.order.paymentStatus },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
