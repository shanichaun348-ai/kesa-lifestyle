import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";

import { MicrosoftClarity } from "@/components/analytics/clarity";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { Toaster } from "@/components/ui/sonner";
import { publicEnv } from "@/lib/env";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

/*
 * Both families are served from files in the repo (src/fonts), not fetched
 * from Google at build time: the server build broke when Google Fonts
 * returned an unexpected URL shape, and a build must not depend on a third
 * party being reachable. Latin subset only; Fraunces is one variable file
 * covering the two weights we use (400/500), within the 120 KB font budget
 * (docs/09 §3, docs/12 §6).
 */
const inter = localFont({
  src: "../fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const fraunces = localFont({
  src: "../fonts/fraunces-latin.woff2",
  weight: "400 500",
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kesa Lifestyle",
    template: "%s | Kesa Lifestyle",
  },
  description: "Premium fashion jewellery for modern Indian wardrobes. Jewellery that completes your look.",
  openGraph: {
    siteName: "Kesa Lifestyle",
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // Browser chrome colour matches the light (blush) default; the in-page toggle cannot update this.
  themeColor: "#f5e1dc",
  width: "device-width",
  initialScale: 1,
};

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
// Validated (digits / alphanumeric) in src/lib/env.ts before being interpolated into inline scripts.
const PIXEL_ID = publicEnv.NEXT_PUBLIC_META_PIXEL_ID;
const CLARITY_ID = publicEnv.NEXT_PUBLIC_CLARITY_PROJECT_ID;
// The consent banner appears as soon as any tracking tag is configured.
const TRACKING_ENABLED = Boolean(GA4_ID || PIXEL_ID || CLARITY_ID);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html>
    // before React hydrates, and that attribute is expected to differ.
    <html lang="en-IN" data-theme={DEFAULT_THEME} className={`${inter.variable} ${fraunces.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Applies the saved or OS theme before first paint (ADR-34). Allowed by the CSP's 'unsafe-inline'. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {GA4_ID ? <GoogleAnalytics measurementId={GA4_ID} /> : null}
        {PIXEL_ID ? <MetaPixel pixelId={PIXEL_ID} /> : null}
        {CLARITY_ID ? <MicrosoftClarity projectId={CLARITY_ID} /> : null}
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
        {/* PageViewTracker uses usePathname — Suspense prevents the layout
            from opting out of static rendering */}
        <Suspense>
          <PageViewTracker />
        </Suspense>
        {TRACKING_ENABLED ? <ConsentBanner /> : null}
      </body>
    </html>
  );
}
