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
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://checkout.razorpay.com`,
      // Google Fonts CSS + Next.js styled components.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts font files + self.
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self, data URIs, and any HTTPS source for product images / OG.
      "img-src 'self' data: https:",
      // XHR/fetch: self + GA + Razorpay + Supabase (direct photo uploads to Storage). Dev adds ws://* for Turbopack HMR.
      `connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.supabase.co${isDev ? " ws://localhost:* wss://localhost:*" : ""}`,
      // Embedded media (audio/video).
      // Product clips stream from Supabase Storage; blob: covers in-browser previews.
      "media-src 'self' https://*.supabase.co blob:",
      // Razorpay payment modal opens in an iframe from api.razorpay.com.
      "frame-src 'self' https://api.razorpay.com https://www.youtube-nocookie.com",
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
  // Self-contained server bundle for the Docker image (deploy/README.md). Harmless on Vercel.
  output: "standalone",
  // Canonical URLs end with a slash (decision D18, ADR-22).
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Product photos uploaded from the admin live in Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // YouTube thumbnails used as default posters for linked product videos.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
    // Small fixed set of widths keeps optimisation cost predictable (docs/12 §4).
    // 1920 and 2560 let full-bleed hero art reach large monitors unscaled (never above the source file's width).
    deviceSizes: [360, 640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [80, 160, 288],
    // Next 16 serves only allow-listed qualities (others are coerced to the nearest); the hero asks for 85.
    qualities: [75, 85],
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
      // Women-only at launch: send men's URLs to the women's range (temporary, not cached as permanent).
      { source: "/men", destination: "/women/", permanent: false },
      { source: "/men/:path*", destination: "/women/", permanent: false },
      // The style guides section was removed; old links land on the homepage.
      { source: "/style-guides", destination: "/", permanent: true },
      { source: "/style-guides/:path*", destination: "/", permanent: true },
      { source: "/style/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
