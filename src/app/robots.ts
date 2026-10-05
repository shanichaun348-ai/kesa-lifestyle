import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * docs/06 §1.5. Parameterised listing URLs are deliberately NOT disallowed:
 * a robots block would hide their `noindex` from Google. Crawl waste is
 * controlled with nofollow on the links that create them.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production";
  if (!isProduction) {
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
