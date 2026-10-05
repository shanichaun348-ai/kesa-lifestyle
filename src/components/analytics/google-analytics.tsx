import Script from "next/script";

/**
 * Injects the Google Analytics 4 measurement scripts.
 *
 * Rendered in the root layout (src/app/layout.tsx) only when
 * NEXT_PUBLIC_GA4_MEASUREMENT_ID is set.
 *
 * Script loading order:
 *   1. `gtag-consent-init` (beforeInteractive) — sets default consent
 *      DENIED and restores a previously-granted choice from localStorage.
 *      Must run before gtag.js so Consent Mode v2 is respected from the
 *      first network request.
 *   2. `gtag.js` (afterInteractive) — the GA4 SDK.
 *   3. `gtag-init` (afterInteractive) — configures the GA4 property with
 *      `send_page_view: false`; page views are tracked manually by the
 *      PageViewTracker component on every client navigation.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      {/*
       * Consent Mode v2 — default DENIED.
       * Also restores a previously-granted choice from localStorage so that
       * returning visitors who already consented are tracked immediately.
       */}
      <Script
        id="gtag-consent-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  analytics_storage:'denied',
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  wait_for_update:2000
});
try{
  var _c=localStorage.getItem('kesa:consent:v1');
  if(_c){var _p=JSON.parse(_c);if(_p.analytics===true){gtag('consent','update',{analytics_storage:'granted'});}}
}catch(e){}
`.trim(),
        }}
      />

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />

      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${measurementId}',{
  send_page_view:false,
  allow_google_signals:false,
  allow_ad_personalization_signals:false
});
`.trim(),
        }}
      />
    </>
  );
}
