/**
 * Microsoft Clarity (`window.clarity`) — consent helper.
 *
 * Loaded by `src/components/analytics/clarity.tsx` only when
 * NEXT_PUBLIC_CLARITY_PROJECT_ID is set. Clarity records sessions without
 * cookies until `clarity('consent')` is called; the banner calls this on
 * accept so returning visitors can be stitched across sessions.
 */

type Clarity = (...args: unknown[]) => void;

export function clarityConsent(granted: boolean): void {
  if (!process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) return;
  if (typeof window === "undefined") return;
  const win = window as Window & { clarity?: Clarity };
  if (typeof win.clarity !== "function") return;
  win.clarity("consent", granted);
}
