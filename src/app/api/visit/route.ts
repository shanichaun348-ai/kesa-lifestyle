import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { recordVisit } from "@/modules/analytics/visits";
import { isBot, storeDay, VISIT_COOKIE, VISIT_COOKIE_MAX_AGE_SECONDS } from "@/modules/analytics/visits-shared";

export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "private, no-store" } };

function clientKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * POST /api/visit/ — the storefront's page-view beacon. Counts one page view,
 * and one visitor when the browser has no visit cookie yet (the cookie lasts
 * 24 hours, so a shopper is one visitor per day however many pages they
 * open). Bots and link previews are ignored. Nothing about the visitor is
 * stored: only two counters per day.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isBot(request.headers.get("user-agent"))) return new NextResponse(null, { status: 204, ...noStore });

  // A runaway tab or script cannot inflate the numbers.
  const limit = consumeMemoryRateLimit(limiterKey("visit", clientKey(request)), 120, 60 * 60);
  if (!limit.allowed) return new NextResponse(null, { status: 204, ...noStore });

  const newVisitor = !request.cookies.get(VISIT_COOKIE)?.value;
  await recordVisit({ day: storeDay(), newVisitor });

  const response = new NextResponse(null, { status: 204, ...noStore });
  if (newVisitor) {
    response.cookies.set(VISIT_COOKIE, "1", {
      maxAge: VISIT_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
