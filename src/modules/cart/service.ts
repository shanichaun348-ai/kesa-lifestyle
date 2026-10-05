/**
 * Server-side cart (docs/08 §4). The cart is a row keyed by an HttpOnly
 * cookie token; a signed-in customer's cart is bound to their profile and a
 * guest cart is merged into it on login. Totals are never stored: every
 * read re-prices the lines from the catalogue through the pricing engine.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Db, DbOrTx } from "@/db/types";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";
import { COUPON_REASON_COPY, priceCart, type CouponInput, type PaymentMethod, type PricingLineInput, type PricingResult, type ShippingMethod } from "@/modules/pricing/engine";
import { loadStoreSettings, type StoreSettings } from "@/modules/settings/store-settings";

export type CartErrorCode = "not_found" | "unavailable" | "insufficient_stock" | "max_quantity" | "coupon_not_found";

export class CartError extends Error {
  constructor(
    readonly code: CartErrorCode,
    message: string,
    readonly details: { sku?: string; available?: number } = {},
  ) {
    super(message);
    this.name = "CartError";
  }
}

export type CartLineIssue = "out_of_stock" | "reduced_stock" | "unavailable" | null;

export type CartLineView = {
  sku: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  optionLabel: string | null;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  quantity: number;
  unitPricePaise: number;
  compareAtPaise: number | null;
  priceChanged: boolean;
  available: number;
  lineSubtotalPaise: number;
  discountPaise: number;
  lineTotalPaise: number;
  issue: CartLineIssue;
};

export type CartView = {
  id: string | null;
  itemCount: number;
  lines: CartLineView[];
  coupon: { code: string; applied: boolean; message: string | null } | null;
  pricing: PricingResult;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  giftWrap: boolean;
  /** True when every line is purchasable at the requested quantity. */
  checkoutReady: boolean;
};

export type CartViewOptions = {
  shippingMethod?: ShippingMethod | undefined;
  paymentMethod?: PaymentMethod | undefined;
  giftWrap?: boolean | undefined;
  destinationStateCode?: string | null | undefined;
  profileId?: string | null | undefined;
};

export type LoadedLine = {
  input: PricingLineInput;
  view: Omit<CartLineView, "lineSubtotalPaise" | "discountPaise" | "lineTotalPaise">;
  variantId: string;
  productId: string;
  gstRateBp: number;
  returnPolicy: "returnable" | "exchange_only" | "final_sale";
  hsnCode: string;
  variantTitle: string | null;
};

export function effectiveVariantPrice(
  v: { pricePaise: number; compareAtPricePaise: number | null; salePricePaise: number | null; saleStartsAt: string | null; saleEndsAt: string | null },
  now: Date,
): { pricePaise: number; compareAtPaise: number | null; isOnSale: boolean } {
  const saleLive =
    v.salePricePaise !== null &&
    v.salePricePaise > 0 &&
    (v.saleStartsAt === null || new Date(v.saleStartsAt) <= now) &&
    (v.saleEndsAt === null || new Date(v.saleEndsAt) >= now);
  if (saleLive && v.salePricePaise !== null) {
    return { pricePaise: v.salePricePaise, compareAtPaise: v.compareAtPricePaise ?? v.pricePaise, isOnSale: true };
  }
  return { pricePaise: v.pricePaise, compareAtPaise: v.compareAtPricePaise, isOnSale: false };
}

/** Sum of `available` across active locations, keyed by variant id. */
export async function loadAvailability(db: DbOrTx, variantIds: string[]): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map();
  const rows = await db
    .select({ variantId: schema.inventory.variantId, available: sql<number>`coalesce(sum(${schema.inventory.available}), 0)::int` })
    .from(schema.inventory)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.inventory.locationId))
    .where(and(inArray(schema.inventory.variantId, variantIds), eq(schema.locations.isActive, true)))
    .groupBy(schema.inventory.variantId);
  return new Map(rows.map((r) => [r.variantId, Number(r.available)]));
}

/** Loads cart lines with live prices, stock and merchandising scope. */
export async function loadCartLines(db: DbOrTx, cartId: string, now: Date): Promise<LoadedLine[]> {
  const rows = await db
    .select({
      item: schema.cartItems,
      variant: schema.productVariants,
      product: {
        id: schema.products.id,
        slug: schema.products.slug,
        name: schema.products.name,
        status: schema.products.status,
        gstRateBp: schema.products.gstRateBp,
        returnPolicy: schema.products.returnPolicy,
        hsnCode: schema.products.hsnCode,
        optionName: schema.products.optionName,
      },
    })
    .from(schema.cartItems)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(eq(schema.cartItems.cartId, cartId))
    .orderBy(schema.cartItems.createdAt);
  if (rows.length === 0) return [];

  const productIds = [...new Set(rows.map((r) => r.product.id))];
  const variantIds = rows.map((r) => r.variant.id);

  const [images, categories, collections, availability, optionValues] = await Promise.all([
    db
      .select({ productId: schema.productImages.productId, path: schema.mediaAssets.storagePath, alt: schema.productImages.altText })
      .from(schema.productImages)
      .innerJoin(schema.mediaAssets, eq(schema.mediaAssets.id, schema.productImages.mediaAssetId))
      .where(and(inArray(schema.productImages.productId, productIds), eq(schema.productImages.role, "primary"))),
    db.select({ productId: schema.productCategories.productId, categoryId: schema.productCategories.categoryId }).from(schema.productCategories).where(inArray(schema.productCategories.productId, productIds)),
    db.select({ productId: schema.productCollections.productId, collectionId: schema.productCollections.collectionId }).from(schema.productCollections).where(inArray(schema.productCollections.productId, productIds)),
    loadAvailability(db, variantIds),
    db
      .select({ variantId: schema.variantOptionValues.variantId, value: schema.productOptionValues.value })
      .from(schema.variantOptionValues)
      .innerJoin(schema.productOptionValues, eq(schema.productOptionValues.id, schema.variantOptionValues.optionValueId))
      .where(inArray(schema.variantOptionValues.variantId, variantIds)),
  ]);

  const imageByProduct = new Map(images.map((i) => [i.productId, i]));
  const categoriesByProduct = new Map<string, string[]>();
  for (const c of categories) categoriesByProduct.set(c.productId, [...(categoriesByProduct.get(c.productId) ?? []), c.categoryId]);
  const collectionsByProduct = new Map<string, string[]>();
  for (const c of collections) collectionsByProduct.set(c.productId, [...(collectionsByProduct.get(c.productId) ?? []), c.collectionId]);
  const optionByVariant = new Map(optionValues.map((o) => [o.variantId, o.value]));

  return rows.map(({ item, variant, product }) => {
    const price = effectiveVariantPrice(variant, now);
    const available = availability.get(variant.id) ?? 0;
    const purchasable = product.status === "active" && variant.status === "active";
    const issue: CartLineIssue = !purchasable ? "unavailable" : available <= 0 ? "out_of_stock" : available < item.quantity ? "reduced_stock" : null;
    const image = imageByProduct.get(product.id);
    const optionValue = optionByVariant.get(variant.id) ?? null;
    const optionLabel = optionValue && product.optionName ? `${product.optionName}: ${optionValue}` : null;
    return {
      variantId: variant.id,
      productId: product.id,
      gstRateBp: product.gstRateBp,
      returnPolicy: product.returnPolicy,
      hsnCode: product.hsnCode,
      variantTitle: optionLabel,
      input: {
        sku: variant.sku,
        productId: product.id,
        quantity: item.quantity,
        unitPricePaise: price.pricePaise,
        compareAtPaise: price.compareAtPaise ?? undefined,
        gstRateBp: product.gstRateBp,
        isOnSale: price.isOnSale,
        categoryIds: categoriesByProduct.get(product.id) ?? [],
        collectionIds: collectionsByProduct.get(product.id) ?? [],
      },
      view: {
        sku: variant.sku,
        variantId: variant.id,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        optionLabel,
        image: image ? { src: `/media/${image.path}`, alt: image.alt, unoptimized: image.path.endsWith(".svg") } : { src: "", alt: product.name },
        quantity: item.quantity,
        unitPricePaise: price.pricePaise,
        compareAtPaise: price.compareAtPaise,
        priceChanged: item.pricePaiseAtAdd !== price.pricePaise,
        available,
        issue,
      },
    };
  });
}

/** Loads a coupon with everything the pricing engine needs to judge it. */
export async function loadCouponInput(db: DbOrTx, couponCodeId: string, profileId: string | null): Promise<CouponInput | null> {
  const [row] = await db
    .select({ code: schema.couponCodes, coupon: schema.coupons })
    .from(schema.couponCodes)
    .innerJoin(schema.coupons, eq(schema.coupons.id, schema.couponCodes.couponId))
    .where(eq(schema.couponCodes.id, couponCodeId))
    .limit(1);
  if (!row || row.coupon.deletedAt) return null;

  const [targets, totalUsage, customerUsage, priorOrders] = await Promise.all([
    db.select().from(schema.couponTargets).where(eq(schema.couponTargets.couponId, row.coupon.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.couponRedemptions).where(eq(schema.couponRedemptions.couponId, row.coupon.id)),
    profileId
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.couponRedemptions)
          .where(and(eq(schema.couponRedemptions.couponId, row.coupon.id), eq(schema.couponRedemptions.profileId, profileId)))
      : Promise.resolve([{ n: 0 }]),
    profileId
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orders)
          .where(and(eq(schema.orders.profileId, profileId), inArray(schema.orders.status, ["paid", "confirmed", "processing", "shipped", "delivered", "completed"])))
      : Promise.resolve(null),
  ]);

  return {
    id: row.coupon.id,
    codeId: row.code.id,
    code: row.code.code,
    kind: row.coupon.kind,
    valueType: row.coupon.valueType,
    value: row.coupon.value,
    appliesTo: row.coupon.appliesTo,
    targetProductIds: targets.map((t) => t.productId).filter((v): v is string => v !== null),
    targetCollectionIds: targets.map((t) => t.collectionId).filter((v): v is string => v !== null),
    targetCategoryIds: targets.map((t) => t.categoryId).filter((v): v is string => v !== null),
    minSubtotalPaise: row.coupon.minSubtotalPaise,
    maxDiscountPaise: row.coupon.maxDiscountPaise,
    firstOrderOnly: row.coupon.firstOrderOnly,
    excludeSaleItems: row.coupon.excludeSaleItems,
    usageLimitTotal: row.coupon.usageLimitTotal,
    usageLimitPerCustomer: row.coupon.usageLimitPerCustomer,
    usageCountTotal: Number(totalUsage[0]?.n ?? 0),
    usageCountForCustomer: Number(customerUsage[0]?.n ?? 0),
    startsAt: row.coupon.startsAt,
    endsAt: row.coupon.endsAt,
    isActive: row.coupon.isActive,
    customerHasPriorOrders: priorOrders === null ? null : Number(priorOrders[0]?.n ?? 0) > 0,
  };
}

export function emptyCartView(settings: StoreSettings, now: Date): CartView {
  const pricing = priceCart({ lines: [], coupon: null, shippingMethod: "standard", destinationStateCode: null, paymentMethod: "razorpay", giftWrap: false, settings, now });
  return { id: null, itemCount: 0, lines: [], coupon: null, pricing, shippingMethod: "standard", paymentMethod: "razorpay", giftWrap: false, checkoutReady: false };
}

export function createCartService(db: Db, clock: () => Date = () => new Date()) {
  async function findActiveByToken(token: string) {
    const [cart] = await db.select().from(schema.carts).where(and(eq(schema.carts.token, token), eq(schema.carts.status, "active"))).limit(1);
    return cart ?? null;
  }

  async function findActiveByProfile(profileId: string) {
    const [cart] = await db.select().from(schema.carts).where(and(eq(schema.carts.profileId, profileId), eq(schema.carts.status, "active"))).orderBy(desc(schema.carts.updatedAt)).limit(1);
    return cart ?? null;
  }

  async function create(profileId: string | null) {
    const [cart] = await db.insert(schema.carts).values({ profileId }).returning();
    if (!cart) throw new CartError("not_found", "Could not create cart");
    return cart;
  }

  /** Merge every line of the guest cart into the profile cart; the guest cart is closed. */
  async function mergeGuestInto(guestCartId: string, profileCartId: string) {
    await db.transaction(async (tx) => {
      const guestItems = await tx.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, guestCartId));
      for (const item of guestItems) {
        await tx
          .insert(schema.cartItems)
          .values({ cartId: profileCartId, variantId: item.variantId, quantity: item.quantity, pricePaiseAtAdd: item.pricePaiseAtAdd })
          .onConflictDoUpdate({
            target: [schema.cartItems.cartId, schema.cartItems.variantId],
            set: { quantity: sql`least(${schema.cartItems.quantity} + ${item.quantity}, ${MAX_QUANTITY_PER_LINE})` },
          });
      }
      await tx.update(schema.carts).set({ status: "merged" }).where(eq(schema.carts.id, guestCartId));
    });
  }

  return {
    findActiveByToken,
    findActiveByProfile,

    /**
     * Resolve the cart for a request. Guest: the cookie cart. Signed in: the
     * profile cart, absorbing any guest cart from the cookie (merge on login).
     */
    async resolve(opts: { token: string | null; profileId: string | null; create: boolean }) {
      const guest = opts.token ? await findActiveByToken(opts.token) : null;
      if (!opts.profileId) {
        if (guest) return guest;
        return opts.create ? await create(null) : null;
      }
      const own = await findActiveByProfile(opts.profileId);
      if (guest && guest.profileId === null) {
        if (own) {
          await mergeGuestInto(guest.id, own.id);
          return (await findActiveByProfile(opts.profileId)) ?? own;
        }
        const [claimed] = await db.update(schema.carts).set({ profileId: opts.profileId }).where(eq(schema.carts.id, guest.id)).returning();
        return claimed ?? guest;
      }
      if (own) return own;
      return opts.create ? await create(opts.profileId) : null;
    },

    async addItem(cartId: string, sku: string, quantity: number) {
      if (quantity < 1) throw new CartError("max_quantity", "Quantity must be at least 1");
      const [row] = await db
        .select({ variant: schema.productVariants, productStatus: schema.products.status })
        .from(schema.productVariants)
        .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
        .where(eq(schema.productVariants.sku, sku))
        .limit(1);
      if (!row || row.productStatus !== "active" || row.variant.status !== "active") throw new CartError("unavailable", "This item is not available.", { sku });

      const availability = await loadAvailability(db, [row.variant.id]);
      const available = availability.get(row.variant.id) ?? 0;
      const [existing] = await db.select({ quantity: schema.cartItems.quantity }).from(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, row.variant.id))).limit(1);
      const wanted = (existing?.quantity ?? 0) + quantity;
      if (wanted > MAX_QUANTITY_PER_LINE) throw new CartError("max_quantity", `You can add up to ${MAX_QUANTITY_PER_LINE} of one item.`, { sku });
      if (wanted > available) throw new CartError("insufficient_stock", available === 0 ? "This item is sold out." : `Only ${available} left in stock.`, { sku, available });

      const price = effectiveVariantPrice(row.variant, clock());
      await db
        .insert(schema.cartItems)
        .values({ cartId, variantId: row.variant.id, quantity, pricePaiseAtAdd: price.pricePaise })
        .onConflictDoUpdate({ target: [schema.cartItems.cartId, schema.cartItems.variantId], set: { quantity: wanted } });
    },

    async setQuantity(cartId: string, sku: string, quantity: number) {
      const [variant] = await db.select({ id: schema.productVariants.id }).from(schema.productVariants).where(eq(schema.productVariants.sku, sku)).limit(1);
      if (!variant) throw new CartError("unavailable", "This item is not available.", { sku });
      if (quantity <= 0) {
        await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variant.id)));
        return;
      }
      if (quantity > MAX_QUANTITY_PER_LINE) throw new CartError("max_quantity", `You can add up to ${MAX_QUANTITY_PER_LINE} of one item.`, { sku });
      const available = (await loadAvailability(db, [variant.id])).get(variant.id) ?? 0;
      if (quantity > available) throw new CartError("insufficient_stock", available === 0 ? "This item is sold out." : `Only ${available} left in stock.`, { sku, available });
      await db.update(schema.cartItems).set({ quantity }).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variant.id)));
    },

    async removeItem(cartId: string, sku: string) {
      const [variant] = await db.select({ id: schema.productVariants.id }).from(schema.productVariants).where(eq(schema.productVariants.sku, sku)).limit(1);
      if (!variant) return;
      await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variant.id)));
    },

    async applyCoupon(cartId: string, code: string) {
      const [row] = await db
        .select({ id: schema.couponCodes.id })
        .from(schema.couponCodes)
        .innerJoin(schema.coupons, eq(schema.coupons.id, schema.couponCodes.couponId))
        .where(sql`lower(${schema.couponCodes.code}) = lower(${code.trim()})`)
        .limit(1);
      if (!row) throw new CartError("coupon_not_found", "We could not find that code.");
      await db.update(schema.carts).set({ couponCodeId: row.id }).where(eq(schema.carts.id, cartId));
    },

    async removeCoupon(cartId: string) {
      await db.update(schema.carts).set({ couponCodeId: null }).where(eq(schema.carts.id, cartId));
    },

    async markConverted(cartId: string) {
      await db.update(schema.carts).set({ status: "converted" }).where(eq(schema.carts.id, cartId));
    },

    async getView(cartId: string | null, opts: CartViewOptions = {}): Promise<CartView> {
      const now = clock();
      const settings = await loadStoreSettings(db);
      if (!cartId) return emptyCartView(settings, now);
      const [cart] = await db.select().from(schema.carts).where(eq(schema.carts.id, cartId)).limit(1);
      if (!cart) return emptyCartView(settings, now);

      const lines = await loadCartLines(db, cart.id, now);
      const coupon = cart.couponCodeId ? await loadCouponInput(db, cart.couponCodeId, opts.profileId ?? cart.profileId) : null;
      const shippingMethod = opts.shippingMethod ?? "standard";
      const paymentMethod = opts.paymentMethod ?? "razorpay";
      const giftWrap = opts.giftWrap ?? false;
      const pricing = priceCart({
        lines: lines.map((l) => l.input),
        coupon,
        shippingMethod,
        destinationStateCode: opts.destinationStateCode ?? null,
        paymentMethod,
        giftWrap,
        settings,
        now,
      });
      const pricedBySku = new Map(pricing.lines.map((l) => [l.sku, l]));

      return {
        id: cart.id,
        itemCount: lines.reduce((n, l) => n + l.view.quantity, 0),
        lines: lines.map((l) => {
          const priced = pricedBySku.get(l.view.sku);
          return {
            ...l.view,
            lineSubtotalPaise: priced?.lineSubtotalPaise ?? 0,
            discountPaise: priced?.discountPaise ?? 0,
            lineTotalPaise: priced?.lineTotalPaise ?? 0,
          };
        }),
        coupon: pricing.coupon
          ? { code: pricing.coupon.code, applied: pricing.coupon.applied, message: pricing.coupon.applied ? null : COUPON_REASON_COPY[pricing.coupon.reason] }
          : cart.couponCodeId
            ? { code: "", applied: false, message: "This code is no longer valid." }
            : null,
        pricing,
        shippingMethod,
        paymentMethod,
        giftWrap,
        checkoutReady: lines.length > 0 && lines.every((l) => l.view.issue === null),
      };
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
