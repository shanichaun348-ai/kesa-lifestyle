/**
 * Meta Pixel (`window.fbq`) — safe wrapper and parameter builders.
 *
 * Loaded by `src/components/analytics/meta-pixel.tsx` only when
 * NEXT_PUBLIC_META_PIXEL_ID is set. Every call here is a noop when the
 * pixel is not configured, the code runs on the server, or the script has
 * not loaded yet, so the storefront never depends on it.
 *
 * Consent: the pixel starts in `revoke` mode and is switched to `grant`
 * by `setConsentState` (see consent.ts). Events fired while revoked are
 * queued by the pixel and sent only after the visitor accepts.
 */

/** Standard events Meta recognises for optimisation and reporting. */
export type PixelStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "AddToWishlist"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

type Fbq = (...args: unknown[]) => void;

function fbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { fbq?: Fbq };
  return typeof win.fbq === "function" ? win.fbq : null;
}

/** True when the build has a pixel id. Referenced literally so Next can inline it. */
export function pixelConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
}

/**
 * Fires a standard event. `eventId` lets Meta de-duplicate the same event
 * if it is ever also sent from the server (Conversions API); use the order
 * number for Purchase.
 */
export function pixelTrack(event: PixelStandardEvent, params: Record<string, unknown> = {}, eventId?: string): void {
  if (!pixelConfigured()) return;
  const f = fbq();
  if (!f) return;
  if (eventId) f("track", event, params, { eventID: eventId });
  else f("track", event, params);
}

/** Grants or revokes the pixel's permission to send data and set cookies. */
export function pixelConsent(granted: boolean): void {
  if (!pixelConfigured()) return;
  const f = fbq();
  if (!f) return;
  f("consent", granted ? "grant" : "revoke");
}

export type PixelLine = {
  /** SKU; this is what the product catalogue feed must use as the item id. */
  id: string;
  quantity: number;
  /** Unit price in INR, not paise. */
  itemPrice: number;
};

/**
 * Builds the commerce parameters Meta expects on ViewContent, AddToCart,
 * InitiateCheckout and Purchase. `value` is the INR total for the event.
 */
export function pixelCommerceParams(lines: readonly PixelLine[], value: number, currency = "INR"): Record<string, unknown> {
  return {
    content_type: "product",
    content_ids: lines.map((l) => l.id),
    contents: lines.map((l) => ({ id: l.id, quantity: l.quantity, item_price: l.itemPrice })),
    num_items: lines.reduce((sum, l) => sum + l.quantity, 0),
    value: Math.round(value * 100) / 100,
    currency,
  };
}
