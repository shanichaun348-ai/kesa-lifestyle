import { NextResponse, type NextRequest } from "next/server";

import { isAuthorisedJobRequest } from "@/lib/jobs/auth";
import { getCheckoutService } from "@/modules/checkout/server";

export const dynamic = "force-dynamic";

/** Cron (every 5 min): cancel unpaid orders whose stock reservation expired, releasing the stock. */
export async function GET(request: NextRequest) {
  if (!isAuthorisedJobRequest(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const service = getCheckoutService();
  if (!service) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const result = await service.releaseExpiredReservations();
  return NextResponse.json(result);
}
