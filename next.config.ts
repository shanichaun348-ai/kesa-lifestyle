import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  // Prevent clickjacking. CSP frame-ancestors is preferred but this covers older browsers.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop browsers from MIME-sniffing away from the declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict powerful browser features we don't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS: enforce HTTPS for 1 year, include subdomains. Preload-ready.
  // Only sent over HTTPS (Vercel strips it on plain HTTP).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // CSP: locked-down baseline. Adjust if new script/style/connect sources are added.
  // unsafe-inline is required for Next.js inline scripts (e.g. __NEXT_DATA__); nonces
  // (ADR-32) will remove this once available.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-eval required by React/Turbopack in dev for callstack reconstruction.
      // Production stays strict (no unsafe-eval).
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
      // Google Fonts CSS + Next.js styled components.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts font files + self.
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self, data URIs, and any HTTPS source for product images / OG.
      "img-src 'self' data: https:",
      // XHR/fetch: self + GA. Dev adds ws://* for Turbopack HMR websocket.
      `connect-src 'self' https://www.google-analytics.com https://analytics.google.com${isDev ? " ws://localhost:* wss://localhost:*" : ""}`,
      // Embedded media (audio/video).
      "media-src 'self'",
      // Frames: none required; SAMEORIGIN covers the admin frame case.
      "frame-src 'none'",
      // Objects (Flash, plugins) — none.
      "object-src 'none'",
      // Base URI lockdown.
      "base-uri 'self'",
      // Form submissions must go to same origin.
      "form-action 'self'",
      // Block all framing (stronger than X-Frame-Options).
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Canonical URLs end with a slash (decision D18, ADR-22).
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Small fixed set of widths keeps optimisation cost predictable (docs/12 §4).
    deviceSizes: [360, 640, 828, 1080, 1440],
    imageSizes: [80, 160, 288],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // /style/[slug]/ → /style-guides/[slug]/ (permanent; preserves link equity)
      {
        source: "/style/:slug/",
        destination: "/style-guides/:slug/",
        permanent: true,
      },
      // /style/[slug] (no trailing slash) also redirected; trailingSlash handles
      // the final normalisation, so this catches any external links without slash.
      {
        source: "/style/:slug",
        destination: "/style-guides/:slug/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
