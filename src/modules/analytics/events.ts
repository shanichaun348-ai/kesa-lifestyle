/**
 * Kesa Lifestyle Analytics — typed event builders.
 *
 * Public API for all analytics events. Each function:
 *   1. Converts paise → INR (÷ 100)
 *   2. Builds a GA4-compatible parameter object
 *   3. Delegates to gtagEvent (noop when GA4 is not configured)
 *
 * Privacy rules (enforced here, not in callers):
 *   - No passwords, payment credentials or raw PII
 *   - No full email addresses in event parameters
 *   - Monetary values always in INR, currency always "INR"
 *
 * See docs/15_ANALYTICS.md for the full event reference.
 */

import { gtagEvent } from "./gtag";
import { CURRENCY } from "./types";

const BRAND = "Kesa Lifestyle";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inr(paise: number): number {
  return Math.round((paise / 100) * 100) / 100;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * page_view — fires on every client-side navigation.
 * Wired: PageViewTracker (src/components/analytics/page-view-tracker.tsx)
 */
export function trackPageView(params: { url: string; title?: string }): void {
  gtagEvent("page_view", {
    page_path: params.url,
    ...(params.title ? { page_title: params.title } : {}),
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * search — fires when a user submits a search query.
 * Wire to: search form submit handler (search page not yet built).
 * Param `search_term` must not include the user's email or personal details.
 */
export function trackSearch(searchTerm: string): void {
  gtagEvent("search", { search_term: searchTerm });
}

// ─── Product ─────────────────────────────────────────────────────────────────

/**
 * view_item — fires when a product detail page is rendered.
 * Wired: ProductViewTracker (src/components/analytics/product-view-tracker.tsx)
 */
export function trackProductView(params: {
  sku: string;
  productName: string;
  pricePaise: number;
  categoryPath?: string | undefined;
}): void {
  const price = inr(params.pricePaise);
  gtagEvent("view_item", {
    currency: CURRENCY,
    value: price,
    items: [
      {
        item_id: params.sku,
        item_name: params.productName,
        item_brand: BRAND,
        currency: CURRENCY,
        price,
        quantity: 1,
        ...(params.categoryPath ? { item_category: params.categoryPath } : {}),
      },
    ],
  });
}

/**
 * view_item_list — fires when a category or collection listing page loads.
 * Wired: CategoryViewTracker (src/components/analytics/category-view-tracker.tsx)
 */
export function trackCategoryView(params: {
  listName: string;
  items: Array<{ id: string; name: string }>;
}): void {
  gtagEvent("view_item_list", {
    item_list_name: params.listName,
    items: params.items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_brand: BRAND,
      currency: CURRENCY,
    })),
  });
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

/**
 * add_to_cart — fires when a product is successfully added to the bag.
 * Wired: PurchasePanel.addToBag (src/components/product/purchase-panel.tsx)
 */
export function trackAddToCart(params: {
  sku: string;
  productName: string;
  pricePaise: number;
  quantity: number;
  categoryPath?: string | undefined;
  optionLabel?: string | undefined;
}): void {
  const price = inr(params.pricePaise);
  gtagEvent("add_to_cart", {
    currency: CURRENCY,
    value: price * params.quantity,
    items: [
      {
        item_id: params.sku,
        item_name: params.productName,
        item_brand: BRAND,
        currency: CURRENCY,
        price,
        quantity: params.quantity,
        ...(params.categoryPath ? { item_category: params.categoryPath } : {}),
        ...(params.optionLabel ? { item_variant: params.optionLabel } : {}),
      },
    ],
  });
}

/**
 * remove_from_cart — fires when a line is removed from the bag.
 * Wired: CartDrawer remove button (src/components/storefront/cart-drawer.tsx)
 *        CartPageContent remove button (src/components/storefront/cart-page-content.tsx)
 */
export function trackRemoveFromCart(params: {
  sku: string;
  productName: string;
  pricePaise: number;
  quantity: number;
  optionLabel?: string | undefined;
}): void {
  const price = inr(params.pricePaise);
  gtagEvent("remove_from_cart", {
    currency: CURRENCY,
    value: price * params.quantity,
    items: [
      {
        item_id: params.sku,
        item_name: params.productName,
        item_brand: BRAND,
        currency: CURRENCY,
        price,
        quantity: params.quantity,
        ...(params.optionLabel ? { item_variant: params.optionLabel } : {}),
      },
    ],
  });
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

/**
 * add_to_wishlist — fires when a product is saved to the wishlist.
 * Wired: WishlistButton toggle (src/components/storefront/wishlist-button.tsx)
 * Note: only fires on ADD, not on remove.
 */
export function trackAddToWishlist(params: {
  productSlug: string;
  productName: string;
  pricePaise?: number | undefined;
}): void {
  const price = params.pricePaise !== undefined ? inr(params.pricePaise) : undefined;
  gtagEvent("add_to_wishlist", {
    currency: CURRENCY,
    ...(price !== undefined ? { value: price } : {}),
    items: [
      {
        item_id: params.productSlug,
        item_name: params.productName,
        item_brand: BRAND,
        currency: CURRENCY,
        quantity: 1,
        ...(price !== undefined ? { price } : {}),
      },
    ],
  });
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

type CheckoutLine = {
  sku: string;
  name: string;
  unitPricePaise: number;
  quantity: number;
  optionLabel?: string | undefined;
};

function linesToItems(lines: readonly CheckoutLine[]) {
  return lines.map((l) => ({
    item_id: l.sku,
    item_name: l.name,
    item_brand: BRAND,
    currency: CURRENCY,
    price: inr(l.unitPricePaise),
    quantity: l.quantity,
    ...(l.optionLabel ? { item_variant: l.optionLabel } : {}),
  }));
}

function linesValue(lines: readonly CheckoutLine[]): number {
  return lines.reduce((sum, l) => sum + inr(l.unitPricePaise) * l.quantity, 0);
}

/**
 * begin_checkout — fires when the user clicks "Checkout" from the bag.
 * Wired: CartDrawer checkout button (src/components/storefront/cart-drawer.tsx)
 *        CartPageContent checkout button (src/components/storefront/cart-page-content.tsx)
 */
export function trackBeginCheckout(
  lines: readonly CheckoutLine[],
  coupon?: string,
): void {
  gtagEvent("begin_checkout", {
    currency: CURRENCY,
    value: linesValue(lines),
    ...(coupon ? { coupon } : {}),
    items: linesToItems(lines),
  });
}

/**
 * add_shipping_info — fires when the user confirms their shipping address.
 * Wire to: checkout shipping step (Phase 2).
 * `shippingTier`: e.g. "Standard", "Express"
 */
export function trackAddShippingInfo(
  lines: readonly CheckoutLine[],
  shippingTier: string,
  coupon?: string,
): void {
  gtagEvent("add_shipping_info", {
    currency: CURRENCY,
    value: linesValue(lines),
    shipping_tier: shippingTier,
    ...(coupon ? { coupon } : {}),
    items: linesToItems(lines),
  });
}

/**
 * add_payment_info — fires when the user confirms their payment method.
 * Wire to: checkout payment step (Phase 2).
 * `paymentType`: e.g. "UPI", "Card", "NetBanking", "COD"
 * NEVER include actual payment credentials, card numbers, or UPI IDs.
 */
export function trackAddPaymentInfo(
  lines: readonly CheckoutLine[],
  paymentType: string,
  coupon?: string,
): void {
  gtagEvent("add_payment_info", {
    currency: CURRENCY,
    value: linesValue(lines),
    payment_type: paymentType,
    ...(coupon ? { coupon } : {}),
    items: linesToItems(lines),
  });
}

/**
 * purchase — fires on the order confirmation page after a successful payment.
 * Wire to: order confirmation page (Phase 2).
 * `orderId`: internal order ID (not payment gateway reference).
 * `revenuePaise`: order total in paise (items + shipping, before tax if exclusive).
 * `shippingPaise`: shipping amount in paise.
 * `taxPaise`: GST amount in paise (if available).
 */
export function trackPurchase(params: {
  orderId: string;
  lines: readonly CheckoutLine[];
  revenuePaise: number;
  shippingPaise?: number | undefined;
  taxPaise?: number | undefined;
  coupon?: string | undefined;
}): void {
  gtagEvent("purchase", {
    transaction_id: params.orderId,
    currency: CURRENCY,
    value: inr(params.revenuePaise),
    ...(params.shippingPaise !== undefined ? { shipping: inr(params.shippingPaise) } : {}),
    ...(params.taxPaise !== undefined ? { tax: inr(params.taxPaise) } : {}),
    ...(params.coupon ? { coupon: params.coupon } : {}),
    items: linesToItems(params.lines),
  });
}

/**
 * refund — fires when a refund is processed (admin action or order cancellation).
 * Wire to: order management / admin refund action (Phase 2).
 * `lines` is optional — omit for full-order refunds when item data is unavailable.
 */
export function trackRefund(params: {
  orderId: string;
  revenuePaise: number;
  lines?: readonly CheckoutLine[] | undefined;
}): void {
  gtagEvent("refund", {
    transaction_id: params.orderId,
    currency: CURRENCY,
    value: inr(params.revenuePaise),
    ...(params.lines ? { items: linesToItems(params.lines) } : {}),
  });
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * sign_up — fires when a new account is created.
 * Wire to: account creation form (Phase 2).
 * `method`: how the account was created, e.g. "email", "google"
 * NEVER include the email address or password.
 */
export function trackSignup(method: string): void {
  gtagEvent("sign_up", { method });
}

/**
 * login — fires when a user logs in to an existing account.
 * Wire to: login form (Phase 2).
 * NEVER include credentials.
 */
export function trackLogin(method: string): void {
  gtagEvent("login", { method });
}

// ─── Custom events ────────────────────────────────────────────────────────────

/**
 * review_submit — fires when a customer submits a product review.
 * Wire to: ProductReviews submit handler (src/components/product/product-reviews.tsx)
 * when the review submission API exists (Phase 2).
 */
export function trackReviewSubmit(productSlug: string, rating: number): void {
  gtagEvent("review_submit", { product_slug: productSlug, rating });
}

/**
 * newsletter_signup — fires when a user submits the newsletter form.
 * Wired: NewsletterForm (src/components/storefront/newsletter-form.tsx)
 * Note: fires the event stub even when the form is not yet connected to an
 * email provider. Remove the stub fire once the form is live if you prefer
 * to only track real signups.
 */
export function trackNewsletterSignup(): void {
  gtagEvent("newsletter_signup", {});
}

/**
 * coupon_apply — fires when a discount code is successfully applied at checkout.
 * Wire to: checkout coupon field (Phase 2).
 * Only the coupon code string is sent — never the discount amount separately
 * (it will appear as part of the purchase event's `coupon` field instead).
 */
export function trackCouponApply(couponCode: string): void {
  gtagEvent("coupon_apply", { coupon_code: couponCode });
}

/**
 * coupon_remove — fires when a discount code is removed at checkout.
 * Wire to: checkout coupon removal (Phase 2).
 */
export function trackCouponRemove(couponCode: string): void {
  gtagEvent("coupon_remove", { coupon_code: couponCode });
}
