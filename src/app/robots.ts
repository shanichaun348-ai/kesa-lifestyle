import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/** Hosts that must never be indexed: local, preview and staging builds. */
const NON_PRODUCTION_HOST = /(^|\.)(localhost|127\.0\.0\.1|vercel\.app|dev-build\.in)$/i;

/**
 * Crawling is allowed only on the real store. On Vercel that is the
 * production environment; on our own server it is whatever host
 * NEXT_PUBLIC_SITE_URL names, unless that host is a known staging domain.
 * Set ROBOTS_DISALLOW_ALL=1 to block crawling anywhere regardless.
 */
export function isIndexableSite(env: Record<string, string | undefined> = process.env): boolean {
  if (env.ROBOTS_DISALLOW_ALL === "1") return false;
  if (env.VERCEL_ENV) return env.VERCEL_ENV === "production";
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;
  try {
    return !NON_PRODUCTION_HOST.test(new URL(siteUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * docs/06 §1.5. Parameterised listing URLs are deliberately NOT disallowed:
 * a robots block would hide their `noindex` from Google. Crawl waste is
 * controlled with nofollow on the links that create them.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexableSite()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart/", "/checkout/", "/account/", "/admin/", "/api/", "/search/", "/wishlist/", "/track-order/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
