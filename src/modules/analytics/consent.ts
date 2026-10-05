/**
 * Consent state management (client-only).
 *
 * Stores the user's analytics consent choice in localStorage so it
 * survives page reloads without re-showing the banner.
 *
 * Consent Mode v2 defaults are set via an inline script BEFORE gtag.js
 * loads (see `src/components/analytics/google-analytics.tsx`). This
 * module handles post-hydration reads and updates.
 */

import { CONSENT_STORAGE_KEY, type ConsentState } from "./types";

function readStored(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && "analytics" in parsed) {
      return parsed as ConsentState;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStored(state: ConsentState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

/** Returns the stored consent state, or null if the user has not yet been asked. */
export function getConsentState(): ConsentState | null {
  return readStored();
}

/**
 * Persists the user's choice and fires the GA4 consent update.
 * Call this from the consent banner when the user accepts or declines.
 */
export function setConsentState(analytics: boolean): void {
  const state: ConsentState = { analytics };
  writeStored(state);

  if (typeof window === "undefined") return;
  const win = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof win.gtag !== "function") return;

  win.gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
  });
}

/**
 * Restores previously-granted consent on page load.
 * Called from the ConsentBanner on mount after the GA4 script has loaded.
 */
export function restoreConsent(): void {
  const stored = readStored();
  if (stored?.analytics === true) {
    setConsentState(true);
  }
}
