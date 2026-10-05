# 08 — Ecommerce Requirements

Business rules for catalogue, pricing, inventory, cart, checkout, payments, shipping, orders, returns, discounts, reviews, growth features and the admin. Data structures are in `05_DATABASE_DESIGN.md`; integration mechanics in `03_TECHNICAL_ARCHITECTURE.md §6`.

---

## 1. Catalogue rules

- A product is visible on the storefront only when `status = active`, `published_at <= now()`, has a primary image, a primary category and ≥ 1 active variant.
- SKU format (recommended): `KL-{CAT}-{SEQ}-{VAR}` e.g. `KL-EAR-00042-GLD`. SKUs are unique and immutable.
- Variants: option types limited to 2 per product and reserved for **Size** (rings, bracelets) and **Length** (chains). **Colour and finish are separate products in a product family** (ADR-29), not variants, so each finish has its own URL, images, copy and reviews. Admin "Duplicate as sibling" copies everything but media, slug and SKU. Option values come from a per-product list with admin presets.
- Badges: `New` = published within 30 days; `Bestseller` = top 10% by `sales_30d` in its category with ≥ 5 sales; `Limited` and `Back in stock` manual/automatic flags. Max one badge displayed on a card.
- Archiving keeps the record and order history; URL returns 410 after a grace period (IA §7).
- Bulk import: CSV with validation report (row-level errors), dry-run mode, image URLs fetched into storage. Export mirrors import format.

## 2. Pricing

- All prices are **MRP-inclusive of GST** (Indian consumer convention). `tax_paise` is derived for invoices: `tax = total × rate / (10000 + rate)` in basis points.
- Effective price = scheduled sale price if active, else base price. Compare-at is shown as strikethrough only when it exceeds the effective price, with the percentage saved.
- Price changes never alter existing orders or carts' snapshots; carts re-read live prices on render and show a notice if a line's price changed.
- Minimum product price configurable (guards against data entry errors, e.g. ₹49).
- Future: multi-currency via a `prices` table keyed by currency; not built in v1.

## 3. Inventory

- Stock is per variant; `available = on_hand − reserved`.
- PDP states: In stock; Only N left (≤ threshold); Out of stock (notify me); Pre-order (if backorder allowed, with ETA text).
- Reservations: created when checkout starts (10 min, extended on activity up to 30 min); consumed on payment capture / COD confirmation; released by cron on expiry or on payment failure.
- Overselling prevented with `SELECT … FOR UPDATE` on `inventory_levels` inside the reservation transaction and a check constraint.
- Admin adjustments require a reason; every change hits the ledger.
- Low-stock digest email to admins daily.

## 4. Cart

- Server-side cart identified by an `HttpOnly` cookie token (guest) or `customer_id` (logged in). On login, guest cart merges into the customer cart (sum quantities, cap at available stock).
- Max quantity per line: 10 (configurable). Max lines: 50.
- Cart shows: items, line totals, subtotal, estimated shipping (by pincode if known), applied discount, "free shipping unlock" progress (if rule exists), estimated delivery.
- Carts untouched for 30 days are marked abandoned (eligible for a single reminder email if consent exists, P2).

## 5. Checkout

Single page, four steps collapsed into one scrollable form on mobile:

1. **Contact:** email, mobile (Indian 10-digit, E.164 stored). Logged-in users prefilled. Option to create account after order.
2. **Address:** pincode first → auto-fill city/state and check serviceability + COD availability; saved addresses for logged-in users.
3. **Shipping method:** Standard (free above threshold, else flat rate) / Express (if available for pincode). Delivery estimate shown.
4. **Payment:** Razorpay (UPI, cards, netbanking, wallets, EMI as available) or Cash on Delivery (if eligible: pincode COD-serviceable, subtotal ≤ cap, customer not blocked, ≤ N COD orders outstanding).

Also on the checkout page: **gift option** (gift wrap with a small fee, gift message printed on the packing slip, prices hidden on the slip). Jewellery is a gifting category; omitting this is a measurable conversion loss.

Rules:
- Order placement is idempotent per checkout attempt (`idempotency_key`); double taps never create two orders.
- Order totals are computed server-side on every action; the client never sends amounts.
- Coupon validation happens on apply and again at order placement.
- Placing the order creates `orders` (pending_payment or cod_pending), reserves stock, and for Razorpay creates a provider order. Order number issued immediately.
- Payment success → `paid`; failure → `payment_failed` with retry allowed for 30 min while the reservation lives; abandonment → cancel + release.
- COD: order `confirmed` after OTP verification on the phone number (P1) or automatically if trust rules pass; admin can cancel suspicious COD orders.
- Confirmation page waits for `paid` (polling up to 60s with a "Confirming your payment" state) before showing success; email includes order number, items, totals, delivery estimate and a tracking link.
- A payment captured after the order was cancelled (stale UPI screen) is reinstated if stock allows, otherwise auto-refunded with a customer notification.
- Guest order lookup at `/track-order/`: order number + email/phone (rate-limited, uniform responses).

## 6. Payments

- Provider: Razorpay (ADR-09). Test mode in preview, live in production, keys from environment.
- Capture: automatic capture on authorisation (Razorpay setting) to avoid authorised-but-uncaptured orders.
- Webhooks: `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`, `order.paid`. Verified with HMAC-SHA256 of raw body using the webhook secret; event ID stored for idempotency; processed inside a transaction with the order row locked.
- Reconciliation: hourly cron compares `pending_payment` orders older than 15 min against Razorpay's Orders API and settles or cancels.
- Refunds: initiated from admin (full/partial), executed via Razorpay Refunds API with an idempotency key, tracked to completion by webhook; COD refunds recorded manually with UPI/bank reference. Every refund or accepted return issues a **GST credit note** against the original invoice (sequentially numbered, PDF stored).
- **Settlement reconciliation (P1):** daily import of Razorpay settlements (API) matched to orders; unmatched or short-settled items listed in `/admin/finance/`.
- **COD remittance reconciliation (P1):** Shiprocket COD remittance reports matched to delivered COD orders; `payment_status` moves to `cod_collected` on remittance, not on delivery.
- Never store card data; Razorpay Checkout is hosted/iframe. PCI scope stays SAQ-A.

## 7. Shipping and fulfilment

- Provider: Shiprocket (ADR-10) behind `ShippingProvider` interface: `checkServiceability(pincode, cod, weight)`, `createShipment(order)`, `generateLabel`, `track(awb)`, `cancel`.
- Settings: origin pincode, default package dimensions/weight by shipping class, free-shipping threshold (e.g. ₹999), flat rate below, express surcharge, COD fee, non-serviceable message.
- Flow: `paid`/`confirmed` → admin "Create shipment" (or auto if setting enabled) → AWB assigned → label/manifest printed → `shipped` with tracking email → webhook/cron updates → `delivered` → `completed` after return window.
- **Batch fulfilment (P0 for launch ops):** select many orders → create shipments → print labels, packing slips and a pick list in one PDF → generate the courier manifest. Day-to-day packing cannot be one-order-at-a-time.
- **Pincode management:** admin can mark pincodes non-serviceable or COD-disabled (e.g. high-RTO areas) overriding the provider's answer.
- Partial fulfilment supported per line.
- RTO (return to origin) handling: status `rto`, stock restored on receipt, COD orders flagged on customer record.
- Delivery estimate on PDP: by pincode cookie; fallback "3–7 days across India".

## 8. Orders lifecycle

```
pending_payment ──paid──► paid ──► processing ──► shipped ──► delivered ──► completed
      │                                 │             │             │
      ├─payment_failed                  └─cancelled   └─rto         └─ return flow → refunded / partially_refunded
      └─cancelled (timeout/abandon)
cod_pending ──confirmed──► confirmed ──► processing ──► … (same)
```

- Transitions are enforced in `modules/orders/state-machine.ts`; invalid transitions throw.
- Every transition writes an `order_events` row and may enqueue outbox jobs (email, stock, loyalty).
- Cancellation by customer allowed until `processing`; by admin anytime before `shipped` (after that → return flow).
- Invoices generated on `paid`/`confirmed` as PDF via `@react-pdf/renderer` in an outbox job, GST-compliant (CGST/SGST vs IGST by state code, HSN per line, seller GSTIN, place of supply), numbered sequentially per financial year. Credit notes follow the same pipeline. (E-invoicing under GST applies only above the turnover threshold; not built until required.)
- **Order editing (P1):** before `processing`, admin can change the shipping address, phone, or swap a line for a sibling/variant of equal price; any monetary change requires cancel-and-recreate so invoices stay immutable.
- **SLA alerts:** orders `paid`/`confirmed` and not shipped within 48h, or shipped and not delivered within 10 days, appear on the dashboard and in a daily admin email.

## 9. Returns and exchanges

- Window: N days from delivery (D7; proposed 7).
- Eligibility by product `return_policy`: `returnable`, `exchange_only` (e.g. earrings for hygiene, if chosen), `final_sale`.
- Customer flow: account → order → "Request return/exchange" → reason + photos (optional) → request `requested`.
- Admin: approve/reject; schedule reverse pickup via provider; on receipt inspect → refund (to source for prepaid; to UPI/bank for COD) or dispatch exchange.
- Stock restored only on `received` with condition OK.
- Refund timelines surfaced to the customer; `MerchantReturnPolicy` schema derived from these settings.

## 10. Discounts and coupons

- Types: percentage, fixed amount, free shipping, buy-X-get-Y (P1).
- Scope: whole order, products, collections, categories.
- Conditions: min subtotal, first order only, specific customers/segments, usage limits (total / per customer), date range, exclude sale items (flag).
- Automatic discounts apply without a code (e.g. "10% off 3+ items"); at most one automatic + one code per order unless `combinable_with = shipping`.
- Discount allocation across lines is proportional to line totals (for accurate per-line tax and partial refunds).
- Coupon errors are specific ("expires", "min ₹999", "first order only") and rate-limited to deter brute force.

## 11. Reviews

- Eligibility: delivered order containing the product (configurable to allow all logged-in users).
- One review per order item; edit allowed within 30 days; photos up to 3 (≤ 5 MB each, processed to WebP).
- Moderation queue; auto-approve for 4–5 stars with no links/profanity (configurable); brand reply.
- Display: average + count on cards (if ≥ 3 reviews) and PDP; sort by recent/helpful; filter by rating.
- Review request email 7 days post-delivery; reminder once after 7 more days if not reviewed and consent exists.

## 12. Referral and loyalty (architecture now, UI Phase 4)

- **Referral:** each customer gets a code; referee gets a first-order discount (code type `referral`); referrer gets points or store credit once the referee's order is `completed` (post return window). Self-referral and same-device abuse checks (hashed device/IP, address similarity).
- **Loyalty:** earn rate (e.g. 1 point per ₹10), tiers by 12-month spend, redemption at checkout as a discount line (points → paise at a fixed rate), expiry 12 months, ledger-based balance. Points reversed on refund.
- Store credit (P2) modelled as a loyalty transaction kind to avoid a second wallet.

## 13. Notifications

| Event | Email | SMS/WhatsApp (P2) |
|---|---|---|
| Login code | ✔ | ✔ |
| Order placed (COD) / paid | ✔ | ✔ |
| Payment failed | ✔ | — |
| Shipped (with tracking) | ✔ | ✔ |
| Out for delivery / delivered | ✔ | ✔ |
| Cancelled / refund initiated / refund completed | ✔ | — |
| Return approved / received | ✔ | — |
| Review request | ✔ | — |
| Back in stock (opt-in) | ✔ | — |
| Welcome + preferences | ✔ | — |

All sends go through the outbox; each template has a plain-text version; marketing emails require opt-in and carry an unsubscribe link.

## 14. Admin roles and permissions

| Role | Products/Content | Inventory | Orders/Refunds | Customers | Discounts | Settings/Users | Audit log |
|---|---|---|---|---|---|---|---|
| **Owner** | full | full | full | full | full | full | read |
| **Manager** | full | full | full | full | full | read | read |
| **Catalog editor** | products, categories, collections, attributes, media | adjust | read | — | — | — | — |
| **Content editor** | homepage, journal, guides, pages, FAQ, navigation, banners, SEO | — | — | — | — | — | — |
| **Support** | read | read | update status, create shipment, notes, returns, refunds ≤ limit | read/update contact, notes | read | — | — |

- Permissions are checked server-side in every action (`requireRole`), never only in UI.
- Admin login uses the same Supabase Auth with mandatory email verification; 2FA (TOTP) required for Owner/Manager (Phase 2 hardening).
- Every mutation writes `audit_logs` with before/after.

## 15. Admin UX requirements

- Dense data tables with server-side pagination, column filters, saved views (P1), bulk actions (publish, archive, add to collection, price update with preview).
- Product editor: tabs (General, Media, Variants & Pricing, Inventory, Organisation, Attributes, Shipping & Returns, SEO), live SERP + card preview, validation summary, "View on storefront" with draft preview token.
- Order detail: timeline, items with fulfilment state, payments, shipments, customer sidebar, action buttons gated by state machine.
- Media library: upload with drag-drop, auto-naming, alt text required, usage count, replace in place.
- Dashboard: today/7d/30d sales, orders by status, AOV, conversion (from analytics events), top products, low stock, pending reviews, failed jobs, SLA breaches, orders needing review.
- **Finance exports (P0):** orders/invoices/credit notes CSV by date range in a GSTR-1-friendly layout (invoice no., date, GSTIN if B2B, place of supply, taxable value, CGST/SGST/IGST, HSN summary). The accountant must not need database access.
- **Admin alerts:** new order (optional), payment needs review, failed webhook signature, outbox dead letters, low stock digest, SLA breaches. Delivered by email; WhatsApp later.
- **Search management:** synonyms, query redirects, zero-result and top-query reports.
- **Size guides:** editable tables linked to products.

## 16. Settings catalogue (editable in admin, non-secret)

Store name, legal name, address, GSTIN, support email/phone/WhatsApp, grievance officer, currency, order number prefix, invoice series, free shipping threshold, flat shipping rate, express surcharge, COD enabled, COD cap, COD fee, COD max outstanding, return window days, review auto-approve rules, low-stock threshold default, announcement bar, social links, feed token, feature flags.

Secrets (API keys, webhook secrets, DB URL) are environment variables only; the settings screen shows configuration *status* (configured / not configured), never values.
