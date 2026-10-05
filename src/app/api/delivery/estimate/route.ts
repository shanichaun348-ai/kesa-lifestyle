import { NextResponse, type NextRequest } from "next/server";

import { getShippingProvider } from "@/modules/shipping/queries";
import { PINCODE_RE } from "@/modules/shipping/types";

/**
 * GET /api/delivery/estimate/?pincode=400001
 * Public, cacheable for an hour per pincode. No personal data is stored.
 */
export async function GET(request: NextRequest) {
  const pincode = (request.nextUrl.searchParams.get("pincode") ?? "").trim();
  if (!PINCODE_RE.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }
  const estimate = await getShippingProvider().estimate(pincode);
  return NextResponse.json(estimate, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
