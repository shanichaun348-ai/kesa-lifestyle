import type { NextConfig } from "next";

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
