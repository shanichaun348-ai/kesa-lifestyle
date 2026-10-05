# 15 — Analytics

Production analytics for Kesa Lifestyle using Google Analytics 4 (GA4) with Google Consent Mode v2.

---

## Architecture

```
window.dataLayer / window.gtag
    ↑
src/components/analytics/google-analytics.tsx   — GA4 script + Consent Mode defaults
src/components/analytics/consent-banner.tsx     — cookie banner (DPDP/GDPR)
src/components/analytics/page-view-tracker.tsx  — fires page_view on route change
src/components/analytics/product-view-tracker.tsx — fires view_item on mount
src/components/analytics/category-view-tracker.tsx — fires view_item_list on mount
    ↑
src/modules/analytics/events.ts   — typed event builders (all monetary values in INR)
src/modules/analytics/gtag.ts     — safe wrapper around window.gtag
src/modules/analytics/consent.ts  — consent state (localStorage + Consent Mode v2)
src/modules/analytics/types.ts    — shared types and constants
```

**Currency**: All prices stored internally in paise. Analytics events convert to INR via `inr(paise) = Math.round(paise) / 100`.

**No-op guard**: Every event function is a no-op when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is unset. Development environments generate no analytics traffic without configuration.

**Privacy defaults**: `allow_google_signals: false` and `allow_ad_personalization_signals: false` are set unconditionally in the GA4 config to prevent advertising features from being accidentally enabled.

---

## Consent Architecture

### Google Consent Mode v2

Before GA4 loads, an inline `beforeInteractive` script:
1. Initialises `window.dataLayer` and `window.gtag`
2. Defaults all consent signals to `denied` with `wait_for_update: 2000`
3. Reads `localStorage["kesa:consent:v1"]` — if already accepted, immediately upgrades to `granted` before the GA4 library loads

When a user makes a choice:
- **Accept** → `gtag('consent', 'update', { analytics_storage: 'granted' })`
- **Decline** → persists `denied`; GA4 fires cookieless pings only

### Consent Banner

`ConsentBanner` is rendered in the root layout and only shown when no prior choice is stored. Both Accept and Decline buttons have equal prominence (no dark patterns). Compliant with India DPDP Act 2023 and GDPR.

Storage key: `kesa:consent:v1`  
Value shape: `{ analytics: true | false, updatedAt: ISO string }`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Yes | GA4 Measurement ID (e.g. `G-XXXXXXXXXX`) |

---

## Events

### Standard Events

#### `page_view`
Fired on every client-side route change via `PageViewTracker`.

| Parameter | Value |
|---|---|
| `page_location` | Full URL |
| `page_title` | `document.title` |

Call site: `src/components/analytics/page-view-tracker.tsx`  
Function: `trackPageView({ url, title? })`

---

#### `view_item` (product_view)
Fired once on mount when a product page is rendered.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Price in INR |
| `items[0].item_id` | SKU |
| `items[0].item_name` | Product name |
| `items[0].item_brand` | `"Kesa Lifestyle"` |
| `items[0].item_category` | Category path (optional) |
| `items[0].price` | Price in INR |

Call site: `src/components/analytics/product-view-tracker.tsx` → rendered in `src/app/(storefront)/products/[slug]/page.tsx`  
Function: `trackProductView({ sku, productName, pricePaise, categoryPath? })`

---

#### `view_item_list` (category_view)
Fired once on mount on listing pages (categories, collections, gender pages).

| Parameter | Value |
|---|---|
| `item_list_name` | Category/collection title |
| `items[].item_id` | Product slug |
| `items[].item_name` | Product name |
| `items[].item_brand` | `"Kesa Lifestyle"` |
| `items[].index` | Position in list (0-based) |

Call site: `src/components/analytics/category-view-tracker.tsx` → rendered in `src/components/catalog/listing-page.tsx`  
Function: `trackCategoryView({ listName, items })`

---

#### `search`
Fired when a search is performed.

| Parameter | Value |
|---|---|
| `search_term` | Query string |

Function: `trackSearch(query: string)`  
Call site: Wire to the search input submit handler when search is implemented.

---

#### `add_to_cart`
Fired when a product is added to the bag.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Line total in INR (price × quantity) |
| `items[0].item_id` | SKU |
| `items[0].item_name` | Product name |
| `items[0].quantity` | Quantity added |
| `items[0].item_variant` | Option label (e.g. `"Size: M"`) |
| `items[0].item_category` | Category path (optional) |
| `items[0].coupon` | Coupon code (optional) |

Call site: `src/components/product/purchase-panel.tsx` → `addToBag()`  
Function: `trackAddToCart({ sku, productName, pricePaise, quantity, categoryPath?, optionLabel?, coupon? })`

---

#### `remove_from_cart`
Fired when a line is removed from the bag.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Line total in INR |
| `items[0].item_id` | SKU |
| `items[0].item_name` | Product name |
| `items[0].quantity` | Quantity removed |
| `items[0].item_variant` | Option label (optional) |

Call sites:
- `src/components/storefront/cart-drawer.tsx` → remove button
- `src/components/storefront/cart-page-content.tsx` → remove button

Function: `trackRemoveFromCart({ sku, productName, pricePaise, quantity, optionLabel? })`

---

#### `add_to_wishlist`
Fired when a product is saved to the wishlist (not when removed).

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Price in INR (if known) |
| `items[0].item_id` | Product slug |
| `items[0].item_name` | Product name |
| `items[0].item_brand` | `"Kesa Lifestyle"` |

Call site: `src/components/storefront/wishlist-button.tsx` → `handleClick()` when `!saved`  
Function: `trackAddToWishlist({ productSlug, productName, pricePaise? })`

---

#### `begin_checkout`
Fired when the user taps Checkout from the bag drawer or bag page.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Basket subtotal in INR |
| `items[]` | All bag lines as GA4 items |
| `coupon` | Coupon code (optional) |

Call sites:
- `src/components/storefront/cart-drawer.tsx` → Checkout link onClick
- `src/components/storefront/cart-page-content.tsx` → Checkout link onClick

Function: `trackBeginCheckout(lines, coupon?)`

---

#### `add_shipping_info`
Fired when the user completes the shipping step at checkout.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Basket subtotal in INR |
| `shipping_tier` | e.g. `"Standard"` |
| `items[]` | Bag lines |
| `coupon` | Coupon code (optional) |

Function: `trackAddShippingInfo(lines, shippingTier, coupon?)`  
Call site: Wire to checkout shipping step completion when checkout is implemented.

---

#### `add_payment_info`
Fired when the user reaches the payment step at checkout.

| Parameter | Value |
|---|---|
| `currency` | `"INR"` |
| `value` | Basket subtotal in INR |
| `payment_type` | e.g. `"UPI"`, `"Card"` |
| `items[]` | Bag lines |
| `coupon` | Coupon code (optional) |

Function: `trackAddPaymentInfo(lines, paymentType, coupon?)`  
Call site: Wire to checkout payment step when checkout is implemented.

---

#### `purchase`
Fired when an order is confirmed.

| Parameter | Value |
|---|---|
| `transaction_id` | Order ID |
| `currency` | `"INR"` |
| `value` | Order revenue in INR |
| `shipping` | Shipping amount in INR (optional) |
| `tax` | Tax amount in INR (optional) |
| `coupon` | Coupon code (optional) |
| `items[]` | Ordered lines |

Function: `trackPurchase({ orderId, lines, revenuePaise, shippingPaise?, taxPaise?, coupon? })`  
Call site: Wire to order confirmation page when checkout is implemented.

---

#### `refund`
Fired when a refund is issued.

| Parameter | Value |
|---|---|
| `transaction_id` | Order ID |
| `currency` | `"INR"` |
| `value` | Refunded amount in INR |
| `items[]` | Refunded lines (optional; omit for full refund) |

Function: `trackRefund({ orderId, revenuePaise, lines? })`  
Call site: Wire to admin refund action when order management is implemented.

---

#### `sign_up`
Fired on successful account registration.

| Parameter | Value |
|---|---|
| `method` | e.g. `"email"`, `"google"` |

Function: `trackSignup(method: string)`  
Call site: Wire to account creation success when auth is implemented.

---

#### `login`
Fired on successful login.

| Parameter | Value |
|---|---|
| `method` | e.g. `"email"`, `"google"` |

Function: `trackLogin(method: string)`  
Call site: Wire to login success when auth is implemented.

---

### Custom Events

#### `review_submit`
Fired when a product review is submitted.

| Parameter | Value |
|---|---|
| `product_slug` | Product slug |
| `rating` | Star rating (1–5) |

Function: `trackReviewSubmit(productSlug: string, rating: number)`  
Call site: Wire to review form submission when reviews are implemented.

---

#### `newsletter_signup`
Fired when the newsletter form is submitted.

*(No additional parameters.)*

Call site: `src/components/storefront/newsletter-form.tsx` → `onSubmit()`  
Function: `trackNewsletterSignup()`

---

#### `coupon_apply`
Fired when a coupon code is successfully applied at checkout.

| Parameter | Value |
|---|---|
| `coupon_code` | The applied code |

Function: `trackCouponApply(couponCode: string)`  
Call site: Wire to coupon application in checkout when implemented.

---

#### `coupon_remove`
Fired when a coupon code is removed at checkout.

| Parameter | Value |
|---|---|
| `coupon_code` | The removed code |

Function: `trackCouponRemove(couponCode: string)`  
Call site: Wire to coupon removal in checkout when implemented.

---

## Data Not Sent

The following data is **never** sent to analytics:

- Passwords or authentication tokens
- Payment card numbers, CVV, or bank details
- Full UPI VPA or account numbers
- Aadhaar or PAN numbers
- Full shipping address (only order ID and totals)

---

## Testing

To verify events are firing:
1. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX` in `.env.local`
2. Open the site and accept analytics consent
3. Open GA4 → **DebugView** (Real-time → DebugView) in the GA4 property
4. Navigate the site; events appear within seconds

Alternatively install the [GA Debugger Chrome extension](https://chrome.google.com/webstore/detail/google-analytics-debugger) for console output.
