import Script from "next/script";

/**
 * Loads the Meta Pixel. Rendered in the root layout only when
 * NEXT_PUBLIC_META_PIXEL_ID is set (validated as digits in src/lib/env.ts).
 *
 * - Consent starts revoked unless the visitor accepted the banner on an
 *   earlier visit (same localStorage key as GA4 Consent Mode).
 * - No automatic PageView: `trackPageView` fires one on every navigation,
 *   so the pixel and GA4 count pages the same way.
 * - No <noscript> fallback image, because it would ping Meta before consent.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  return (
    <Script
      id="meta-pixel-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
var _g=false;try{var _c=localStorage.getItem('kesa:consent:v1');if(_c){_g=JSON.parse(_c).analytics===true;}}catch(e){}
fbq('consent',_g?'grant':'revoke');
fbq('init','${pixelId}');
`.trim(),
      }}
    />
  );
}
