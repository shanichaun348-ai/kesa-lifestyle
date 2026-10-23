import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/*
 * Fraunces is a large variable family. We request two static weights so the
 * font payload stays inside the 120 KB budget (docs/09 §3, docs/12 §6).
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
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
  // Browser chrome colour matches the dark default; the in-page toggle cannot update this.
  themeColor: "#0f0e0c",
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
