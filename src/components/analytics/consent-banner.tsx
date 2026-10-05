"use client";

import * as React from "react";

import { getConsentState, restoreConsent, setConsentState } from "@/modules/analytics/consent";

/**
 * Cookie consent banner (India DPDP Act + GDPR-compatible).
 *
 * Shown on first visit when no consent choice has been stored.
 * Both "Accept" and "Decline" dismiss the banner — neither is pre-selected
 * or styled more prominently (no dark patterns).
 *
 * On mount: restores a previously-granted choice so returning users
 * who already accepted are tracked immediately.
 */
export function ConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    restoreConsent();
    const stored = getConsentState();
    if (stored === null) {
      React.startTransition(() => setVisible(true));
    }
  }, []);

  function accept() {
    setConsentState(true);
    setVisible(false);
  }

  function decline() {
    setConsentState(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface px-4 py-4 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-md"
    >
      <p id="consent-title" className="text-sm font-medium text-ink">
        Analytics cookies
      </p>
      <p id="consent-desc" className="mt-1 text-xs text-ink-muted">
        We use Google Analytics to understand how people find and use this site.
        No personal data is shared with advertising networks.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-sm bg-ink px-3 py-1.5 text-xs font-medium text-bg hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={decline}
          className="flex-1 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
