import "server-only";

import { absoluteUrl, site } from "@/lib/site";
import type { Category, Product, ProductVariant } from "@/modules/catalog/types";
import { categoryPathToGpc } from "./gpc-mapping";

/**
 * Google Shopping XML feed builder (RSS 2.0 + Google Base namespace).
 *
 * One feed item is generated per product offer:
 *   – Single-variant product  → one item (id = product slug)
 *   – Multi-variant product   → one item per variant (id = slug--sku)
 *   – Finish/colour siblings  → separate products, already have distinct slugs;
 *                               grouped via item_group_id = familyId
 *
 * Feed format: RSS 2.0 with xmlns:g="http://base.google.com/ns/1.0"
 * Spec: https://support.google.com/merchants/answer/7052112
 */

export type FeedOptions = {
  /** Standard shipping rate in paise (cents). Shown per item; free-shipping
   *  threshold is configured in GMC account-level shipping settings. */
  shippingPricePaise: number;
  /** Exact label of a return policy created in GMC > Shopping > Returns.
   *  If omitted, no return_policy_label is emitted (GMC falls back to account default). */
  returnPolicyLabel?: string | undefined;
};

// ─── XML helpers ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function priceFmt(paise: number): string {
  return `${(paise / 100).toFixed(2)} INR`;
}

function clampStr(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// ─── Category helpers ──────────────────────────────────────────────────────

function buildProductType(categoryPath: string, categories: Category[]): string {
  const parts = categoryPath.split("/");
  const labels: string[] = ["Jewellery"];
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const cat = categories.find((c) => c.path === current);
    if (cat) labels.push(cat.name);
  }
  return labels.join(" > ");
}

// ─── Per-offer item builder ────────────────────────────────────────────────

function buildItem(
  product: Product,
  variant: ProductVariant,
  isMultiVariant: boolean,
  categories: Category[],
  opts: FeedOptions,
): string {
  const id = isMultiVariant ? `${product.slug}--${variant.sku}` : product.slug;
  const variantParam = isMultiVariant ? `?variant=${encodeURIComponent(variant.sku)}` : "";
  const link = absoluteUrl(`/products/${product.slug}/${variantParam}`);
  const gpc = categoryPathToGpc(product.primaryCategoryPath);
  const productType = buildProductType(product.primaryCategoryPath, categories);

  const firstImage = product.images[0];
  const additionalImages = product.images.slice(1, 11);

  // Price vs sale_price: compareAtPaise is the "was" price; pricePaise is current.
  const compareAt = variant.compareAtPaise;
  const hasDiscount = typeof compareAt === "number" && compareAt > variant.pricePaise;
  const regularPricePaise = hasDiscount ? (compareAt as number) : variant.pricePaise;
  const salePricePaise = hasDiscount ? variant.pricePaise : null;

  // item_group_id groups finish siblings (same familyId) and size variants
  // (same product.slug) so GMC understands variant relationships.
  const itemGroupId =
    product.familyId ?? (product.variants.length > 1 ? product.slug : null);

  const title = clampStr(product.name, 150);
  const description = clampStr(
    product.description.length > 0 ? product.description.join(" ") : product.shortDescription,
    5000,
  );
  const gender = product.gender === "women" ? "female" : product.gender === "men" ? "male" : "unisex";
  const material = product.attributes.material?.[0]?.replace(/-/g, " ");
  const color = product.attributes.color?.join(", ");

  let item = `  <item>\n`;

  // Required attributes
  item += `    <g:id>${esc(id)}</g:id>\n`;
  item += `    <g:title>${cdata(title)}</g:title>\n`;
  item += `    <g:description>${cdata(description)}</g:description>\n`;
  item += `    <g:link>${esc(link)}</g:link>\n`;

  if (firstImage) {
    item += `    <g:image_link>${esc(absoluteUrl(firstImage.src))}</g:image_link>\n`;
  }
  for (const img of additionalImages) {
    item += `    <g:additional_image_link>${esc(absoluteUrl(img.src))}</g:additional_image_link>\n`;
  }

  item += `    <g:availability>${variant.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>\n`;
  item += `    <g:price>${priceFmt(regularPricePaise)}</g:price>\n`;
  if (salePricePaise !== null) {
    item += `    <g:sale_price>${priceFmt(salePricePaise)}</g:sale_price>\n`;
  }

  item += `    <g:brand>${esc(site.name)}</g:brand>\n`;
  item += `    <g:condition>new</g:condition>\n`;

  // Products are fashion jewellery without GTINs. Declaring identifier_exists=no
  // prevents Merchant Center from showing "missing GTIN" warnings.
  item += `    <g:identifier_exists>no</g:identifier_exists>\n`;

  // Classification
  item += `    <g:product_type>${cdata(productType)}</g:product_type>\n`;
  item += `    <g:google_product_category>${gpc}</g:google_product_category>\n`;

  // Variant grouping
  if (itemGroupId) {
    item += `    <g:item_group_id>${esc(itemGroupId)}</g:item_group_id>\n`;
  }

  // Variant-specific attributes
  if (variant.optionValue && product.optionName) {
    item += `    <g:size>${esc(variant.optionValue)}</g:size>\n`;
  }
  if (material) item += `    <g:material>${esc(material)}</g:material>\n`;
  if (color) item += `    <g:color>${esc(color)}</g:color>\n`;

  // Demographic attributes
  item += `    <g:gender>${gender}</g:gender>\n`;
  item += `    <g:age_group>adult</g:age_group>\n`;

  // Shipping (flat rate; free-shipping threshold handled in GMC shipping settings)
  item += `    <g:shipping>\n`;
  item += `      <g:country>IN</g:country>\n`;
  item += `      <g:service>Standard</g:service>\n`;
  item += `      <g:price>${priceFmt(opts.shippingPricePaise)}</g:price>\n`;
  item += `    </g:shipping>\n`;

  // Return policy label: references a policy created in GMC > Returns
  if (opts.returnPolicyLabel) {
    item += `    <g:return_policy_label>${esc(opts.returnPolicyLabel)}</g:return_policy_label>\n`;
  }

  item += `  </item>\n`;
  return item;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function buildGoogleShoppingFeed(
  products: Product[],
  categories: Category[],
  opts: FeedOptions,
): string {
  const now = new Date().toUTCString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`;
  xml += `<channel>\n`;
  xml += `  <title>${esc(site.name + " Product Feed")}</title>\n`;
  xml += `  <link>${esc(site.url)}</link>\n`;
  xml += `  <description>${esc(site.description)}</description>\n`;
  xml += `  <lastBuildDate>${now}</lastBuildDate>\n\n`;

  for (const product of products) {
    if (product.variants.length === 0) continue;

    if (product.variants.length === 1) {
      const variant = product.variants[0]!;
      xml += buildItem(product, variant, false, categories, opts);
    } else {
      for (const variant of product.variants) {
        xml += buildItem(product, variant, true, categories, opts);
      }
    }
  }

  xml += `</channel>\n`;
  xml += `</rss>`;
  return xml;
}
