/**
 * Safe wrapper around window.gtag.
 *
 * Guards:
 * - Server-side rendering (typeof window === "undefined")
 * - Missing GA4 Measurement ID (env var not configured)
 * - gtag not yet loaded (script deferred)
 *
 * All calls are noop when any guard fails — analytics is never
 * required for the storefront to function.
 */

type GtagCommand = "event" | "config" | "consent" | "js" | "set";

function safeGtag(command: GtagCommand, ...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const win = window as Window & { gtag?: (...a: unknown[]) => void };
  if (typeof win.gtag !== "function") return;
  win.gtag(command, ...args);
}

export function gtagEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) return;
  safeGtag("event", eventName, params ?? {});
}
