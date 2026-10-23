import Script from "next/script";

/**
 * Loads Microsoft Clarity (session recordings and heatmaps). Rendered in the
 * root layout only when NEXT_PUBLIC_CLARITY_PROJECT_ID is set (validated as
 * alphanumeric in src/lib/env.ts). Cookie consent is granted only after the
 * visitor accepts the banner; recordings before that are cookieless.
 */
export function MicrosoftClarity({ projectId }: { projectId: string }) {
  return (
    <Script
      id="clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");
try{var _c=localStorage.getItem('kesa:consent:v1');if(_c&&JSON.parse(_c).analytics===true){window.clarity('consent');}}catch(e){}
`.trim(),
      }}
    />
  );
}
