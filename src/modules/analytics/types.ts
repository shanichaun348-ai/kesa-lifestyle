/**
 * Analytics event types for Kesa Lifestyle.
 *
 * All monetary values are in paise (integer). The event builders in
 * `events.ts` convert to INR (÷ 100) before sending to GA4.
 *
 * Never add: passwords, payment credentials, full email addresses,
 * raw phone numbers, full postal addresses, or any PII beyond what
 * GA4 collects by default (anonymous client ID, device type, country).
 */

// ─── Currency ────────────────────────────────────────────────────────────────

export const CURRENCY = "INR" as const;

// ─── Consent ─────────────────────────────────────────────────────────────────

export type ConsentState = {
  analytics: boolean;
};

export const CONSENT_STORAGE_KEY = "kesa:consent:v1";

// ─── GA4 item (ecommerce) ─────────────────────────────────────────────────────

/** One product item as expected by GA4 ecommerce events. Prices in INR (not paise). */
export type GA4Item = {
  item_id: string;
  item_name: string;
  currency: typeof CURRENCY;
  price?: number | undefined;
  quantity?: number | undefined;
  item_category?: string | undefined;
  item_brand?: string | undefined;
  item_variant?: string | undefined;
  coupon?: string | undefined;
};

// ─── Event parameter shapes ───────────────────────────────────────────────────

export type PageViewParams = {
  page_path: string;
  page_title?: string | undefined;
};

export type SearchParams = {
  search_term: string;
};

export type ViewItemParams = {
  currency: typeof CURRENCY;
  value?: number | undefined;
  items: GA4Item[];
};

export type ViewItemListParams = {
  item_list_name: string;
  items: GA4Item[];
};

export type AddToCartParams = {
  currency: typeof CURRENCY;
  value: number;
  items: GA4Item[];
};

export type RemoveFromCartParams = {
  currency: typeof CURRENCY;
  value: number;
  items: GA4Item[];
};

export type AddToWishlistParams = {
  currency: typeof CURRENCY;
  value?: number | undefined;
  items: GA4Item[];
};

export type BeginCheckoutParams = {
  currency: typeof CURRENCY;
  value: number;
  coupon?: string | undefined;
  items: GA4Item[];
};

export type AddShippingInfoParams = {
  currency: typeof CURRENCY;
  value: number;
  shipping_tier: string;
  coupon?: string | undefined;
  items: GA4Item[];
};

export type AddPaymentInfoParams = {
  currency: typeof CURRENCY;
  value: number;
  payment_type: string;
  coupon?: string | undefined;
  items: GA4Item[];
};

export type PurchaseParams = {
  transaction_id: string;
  currency: typeof CURRENCY;
  value: number;
  shipping?: number | undefined;
  tax?: number | undefined;
  coupon?: string | undefined;
  items: GA4Item[];
};

export type RefundParams = {
  transaction_id: string;
  currency: typeof CURRENCY;
  value: number;
  items?: GA4Item[] | undefined;
};

export type LoginParams = {
  method: string;
};

export type SignUpParams = {
  method: string;
};

/** Custom events (not in GA4 standard ecommerce) */
export type ReviewSubmitParams = {
  product_slug: string;
  rating: number;
};

export type NewsletterSignupParams = Record<string, never>;

export type CouponApplyParams = {
  coupon_code: string;
};

export type CouponRemoveParams = {
  coupon_code: string;
};
