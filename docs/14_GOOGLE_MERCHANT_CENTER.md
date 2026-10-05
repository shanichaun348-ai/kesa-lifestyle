# Google Merchant Center — Integration Guide

> **Status**: Architecture implemented. Manual GMC account steps and production
> domain required before products can be approved. See checklist below.

---

## Architecture overview

```
/api/feed/google-shopping          ← RSS 2.0 XML feed endpoint
src/modules/feed/google-shopping.ts  ← pure XML builder (server-only)
src/modules/feed/gpc-mapping.ts      ← category → GPC code mapping
```

The feed generates one offer per product variant (not per product):

| Kesa product type | Feed items generated |
|---|---|
| Single-variant product | 1 item, `id = product-slug` |
| Multi-variant (ring sizes, chain lengths) | 1 item per variant, `id = slug--sku` |
| Finish/colour siblings (familyId) | 1 item per sibling, `item_group_id = familyId` |

---

## Feed URL

### Development (no token)
```
http://localhost:3000/api/feed/google-shopping
```

### Production (with token)
```
https://kesalifestyle.com/api/feed/google-shopping?token=<FEED_TOKEN>
```

> **Note:** GMC supports "fetch parameters" (query string parameters) in the
> scheduled fetch URL, so `?token=xxx` works natively without any proxy.

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | `http://localhost:3000` | Base URL for all product/image links. **Must be `https://`** in production. |
| `FEED_TOKEN` | Recommended | *(none — feed is public)* | Secret token. If set, requests without `?token=<value>` return 401. |
| `SHIPPING_STANDARD_PAISE` | No | `5900` (₹59) | Standard shipping cost in paise. Override when shipping rate changes. |
| `GOOGLE_RETURN_POLICY_LABEL` | No | *(omitted)* | Exact label of a return policy created in GMC > Shipping & returns > Return policies. Set after creating the policy in GMC. |

---

## Required feed attributes: mapping

| GMC attribute | Source |
|---|---|
| `g:id` | `product.slug` (or `slug--sku` for variants) |
| `g:title` | `product.name` (clamped 150 chars) |
| `g:description` | `product.description.join(' ')` → `shortDescription` fallback (5000 chars) |
| `g:link` | `NEXT_PUBLIC_SITE_URL/products/{slug}/` |
| `g:image_link` | `NEXT_PUBLIC_SITE_URL + product.images[0].src` |
| `g:additional_image_link` | Up to 10 more images from `product.images` |
| `g:availability` | `in_stock` / `out_of_stock` from `variant.stock` |
| `g:price` | `variant.compareAtPaise` if present, else `pricePaise` (currency: INR) |
| `g:sale_price` | `variant.pricePaise` when `compareAtPaise > pricePaise` |
| `g:brand` | `"Kesa Lifestyle"` (from `site.name`) |
| `g:condition` | `new` (all products) |
| `g:identifier_exists` | `no` — jewellery without GTINs; prevents GMC GTIN warnings |
| `g:product_type` | Category breadcrumb, e.g. `Jewellery > Women > Earrings` |
| `g:google_product_category` | GPC numeric ID (193 = Earrings, 194 = Necklaces, etc.) |
| `g:item_group_id` | `product.familyId` (finish siblings) or `product.slug` (size variants) |
| `g:size` | `variant.optionValue` when `optionName` is Size or Length |
| `g:material` | `product.attributes.material[0]` |
| `g:color` | `product.attributes.color` joined |
| `g:gender` | `female` / `male` / `unisex` from `product.gender` |
| `g:age_group` | `adult` (all products) |
| `g:shipping` | `IN / Standard / ₹59.00` (per item; free threshold configured in GMC) |
| `g:return_policy_label` | From `GOOGLE_RETURN_POLICY_LABEL` env var (optional) |

---

## Step-by-step: connecting to Google Merchant Center

### 1. Prerequisites (do these first)

- [ ] A verified Google account
- [ ] Production domain (`https://kesalifestyle.com` or similar)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production HTTPS URL
- [ ] `FEED_TOKEN` set in production env (generate with `openssl rand -hex 32`)
- [ ] Real product images uploaded (Google requires HTTPS URLs; no SVG placeholders)
- [ ] `src/app/(storefront)/returns-policy/page.tsx` deployed (MerchantReturnPolicy JSON-LD)
- [ ] `src/app/(storefront)/shipping-policy/page.tsx` deployed (OfferShippingDetails JSON-LD)

### 2. Create a Merchant Center account

1. Go to [merchants.google.com](https://merchants.google.com)
2. Create a new account
3. Enter your **business name** (Kesa Lifestyle), **country** (India), and **time zone**

### 3. Verify and claim your website

1. In GMC: **Business information > Website**
2. Add your domain: `https://kesalifestyle.com`
3. Verify via one of:
   - HTML tag in `<head>` (add to `src/app/layout.tsx` metadata)
   - Google Analytics (if connected)
   - Google Tag Manager
   - DNS TXT record
4. After verification, click **Claim website**

### 4. Configure business information

In GMC > **Business information**:
- [ ] Business name: Kesa Lifestyle
- [ ] Business address (required for India)
- [ ] Phone number
- [ ] Customer service email
- [ ] Business logo

### 5. Configure shipping settings

In GMC > **Shipping and returns > Shipping settings**:
1. Create a shipping service for India:
   - **Service name**: Standard Shipping India
   - **Country**: India
   - **Currency**: INR
   - **Shipping rate**: ₹59 flat OR free for orders ≥ ₹999
     - To add a free threshold: use "Set shipping costs based on order total"
     - Range 0–999 INR: ₹59
     - Range 999+ INR: ₹0 (free)
2. Set the transit time: 3–5 business days
3. Note: per-item shipping in the feed (`g:shipping`) sets the base rate; account-level
   rules override it when total qualifies for free shipping

### 6. Configure return policy

In GMC > **Shipping and returns > Return policies**:
1. Create a return policy:
   - **Policy name**: `kesa-7-day-returns` (or your choice — this becomes `GOOGLE_RETURN_POLICY_LABEL`)
   - **Country**: India
   - **Return window**: 7 days after delivery
   - **Return method**: By mail
   - **Return reason**: Any reason / change of mind
2. Save the policy
3. Set `GOOGLE_RETURN_POLICY_LABEL=kesa-7-day-returns` in your production environment
4. Redeploy so the feed includes `g:return_policy_label`

### 7. Add the product feed

In GMC > **Products > Feeds**:
1. Click **+** to add a new feed
2. **Target country**: India
3. **Language**: English
4. **Feed name**: Kesa Lifestyle Primary Feed
5. **Input method**: Scheduled fetch
6. **File URL**: `https://kesalifestyle.com/api/feed/google-shopping?token=<FEED_TOKEN>`
   - Replace `<FEED_TOKEN>` with your actual token from the `FEED_TOKEN` env var
7. **Fetch frequency**: Daily
8. **Fetch time**: 2:00 AM IST (midnight UTC, low-traffic window)
9. Click **Create feed**

### 8. Trigger the first fetch

After adding the feed:
1. In the feed details, click **Fetch now**
2. Wait 5–10 minutes for processing
3. Check **Products > All products** for errors or disapprovals

---

## Required GMC account settings (summary)

| Setting | Where | Required value |
|---|---|---|
| Website verified + claimed | Business info > Website | ✓ |
| Business address | Business info | India address |
| Shipping service | Shipping > Services | India / INR / 3-5 days |
| Free shipping threshold | Shipping > Services | Orders ≥ ₹999 → ₹0 |
| Return policy | Shipping > Returns | 7 days / mail |
| Tax settings | Tax | Not applicable (India — GST handled separately) |
| Identity verification | Growth > Manage programs | Required for Shopping ads |

---

## Common disapprovals and fixes

| Disapproval | Cause | Fix |
|---|---|---|
| Image quality | Placeholder SVGs; images too small | Replace with real photos ≥ 800×800px on HTTPS |
| Policy violations | Returns / shipping policy pages not deployed | Deploy `/returns-policy/` and `/shipping-policy/` |
| Missing shipping | Shipping service not configured in GMC | Complete step 5 above |
| Price mismatch | Feed price ≠ price on product page | Ensure `NEXT_PUBLIC_SITE_URL` points to correct store |
| Website not claimed | Domain mismatch | Verify domain matches `NEXT_PUBLIC_SITE_URL` |
| GTIN warnings | (Expected for fashion without GTINs) | Already handled: `identifier_exists=no` in feed |

---

## Google does not automatically approve products

Submitting a feed does not guarantee approval. Google reviews products against its
[Shopping policies](https://support.google.com/merchants/answer/6149hmo). Common
reasons for rejection in the jewellery category:

- Images that are not on a neutral/white background for Shopping ads (editorial
  images may still be used in free listings)
- Prices that change without the feed being updated (schedule daily fetches)
- Product pages that require login to view

Allow 3–5 business days for initial review after the first successful fetch.

---

## Feed health monitoring

The feed URL can be tested at any time:

```bash
curl -s "https://kesalifestyle.com/api/feed/google-shopping?token=<FEED_TOKEN>" \
  | head -50
```

To count items in the feed:
```bash
curl -s "https://kesalifestyle.com/api/feed/google-shopping?token=<FEED_TOKEN>" \
  | grep -c '<item>'
```

In GMC, the feed processing report shows:
- Total items submitted
- Active items (approved)
- Items with warnings
- Items with errors (disapproved)

Check this report after each daily fetch and resolve any new errors promptly.
