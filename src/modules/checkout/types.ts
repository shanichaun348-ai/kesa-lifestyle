/**
 * Server-side checkout types. These are the authoritative types for the
 * pricing engine — never derived from client-supplied data.
 */

/** What the browser is allowed to submit — trusted identifiers only. */
export type CartInput = {
  lines: CartLine[];
  couponCode?: string;
};

export type CartLine = {
  sku: string;
  quantity: number;
};

/** A single line in the server-priced order — immutable snapshot at order time. */
export type PricedLine = {
  sku: string;
  productId: string;
  productName: string;
  variantOptionValue?: string;
  quantity: number;
  /** Server-read price, never from the client. */
  unitPricePaise: number;
  compareAtPaise?: number;
  lineTotalPaise: number;
  /** GST rate in basis points, e.g. 300 = 3%. GST is INCLUSIVE in the price. */
  gstRateBp: number;
  hsnCode: string;
};

export type AppliedCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discountPaise: number;
};

/** Authoritative order total — this is the amount sent to Razorpay. */
export type PricingResult = {
  lines: PricedLine[];
  subtotalPaise: number;
  coupon: AppliedCoupon | null;
  discountPaise: number;
  shippingPaise: number;
  /**
   * GST component within subtotalPaise (INCLUSIVE — for invoice display only,
   * not an additional charge).
   */
  gstPaise: number;
  /** Final payable amount = subtotal - discount + shipping. Pass this to Razorpay. */
  totalPaise: number;
};

export type PricingErrorCode =
  | "EMPTY_CART"
  | "INVALID_QUANTITY"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_ACTIVE"
  | "VARIANT_NOT_FOUND"
  | "OUT_OF_STOCK"
  | "COUPON_NOT_FOUND"
  | "COUPON_INACTIVE"
  | "COUPON_EXPIRED"
  | "COUPON_USAGE_LIMIT_REACHED"
  | "COUPON_MIN_ORDER_NOT_MET"
  | "COUPON_NOT_APPLICABLE";

export type PricingError = {
  code: PricingErrorCode;
  message: string;
  sku?: string;
  couponCode?: string;
};

export type PricingOutcome = { ok: true; result: PricingResult } | { ok: false; error: PricingError };
