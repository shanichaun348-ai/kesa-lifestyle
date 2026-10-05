import { timingSafeEqual } from "node:crypto";

import { type NextRequest } from "next/server";

import { getCatalogRepository } from "@/modules/catalog/queries";
import { buildGoogleShoppingFeed } from "@/modules/feed/google-shopping";

/**
 * Google Shopping product feed — RSS 2.0 / Google Base XML.
 *
 * GET /api/feed/google-shopping
 *   – Returns application/xml; charset=utf-8
 *   – If FEED_TOKEN env var is set, the request must include ?token=<FEED_TOKEN>
 *
 * Setup: see docs/14_GOOGLE_MERCHANT_CENTER.md
 *
 * Scalability note: builds the full XML in memory (fine for < 10 000 products).
 * For larger catalogues, switch to streaming: replace `buildGoogleShoppingFeed`
 * with an async generator and return `new Response(ReadableStream, { headers })`.
 */

export const dynamic = "force-dynamic"; // always fetch fresh product data

export async function GET(request: NextRequest): Promise<Response> {
  // ── Token gate ────────────────────────────────────────────────────────────
  // In production, FEED_TOKEN is REQUIRED. A missing token means the feed
  // would be publicly readable — fail safe and log a config error instead.
  const feedToken = process.env.FEED_TOKEN;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !feedToken) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "feed_config",
        message:
          "FEED_TOKEN is not configured in production. " +
          "The Google Shopping feed is blocked to prevent unauthorized data exposure. " +
          "Set the FEED_TOKEN environment variable and restart.",
        ts: new Date().toISOString(),
      }),
    );
    return new Response("Feed not available — configuration error.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (feedToken) {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    // Timing-safe comparison: pad both sides to the same byte length so
    // timingSafeEqual never throws and doesn't reveal the expected length.
    const aBytes = Buffer.from(token, "utf-8");
    const bBytes = Buffer.from(feedToken, "utf-8");
    const maxLen = Math.max(aBytes.length, bBytes.length);
    const a = Buffer.alloc(maxLen, 0);
    const b = Buffer.alloc(maxLen, 0);
    aBytes.copy(a);
    bBytes.copy(b);
    const match = aBytes.length === bBytes.length && timingSafeEqual(a, b);
    if (!match) {
      return new Response("Unauthorized — include ?token=<FEED_TOKEN> in the URL", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const repo = getCatalogRepository();
  const [products, categories] = await Promise.all([
    repo.getAllActiveProducts(),
    repo.getCategories(),
  ]);

  const shippingPaise = Number(process.env.SHIPPING_STANDARD_PAISE ?? 5900); // ₹59 default
  const returnPolicyLabel = process.env.GOOGLE_RETURN_POLICY_LABEL ?? undefined;

  const xml = buildGoogleShoppingFeed(products, categories, {
    shippingPricePaise: shippingPaise,
    returnPolicyLabel,
  });

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // GMC typically fetches once per day; 1 h CDN cache + 24 h stale window
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      // Prevent the feed itself from appearing in search results
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
