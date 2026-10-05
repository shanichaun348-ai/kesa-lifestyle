import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appAll, id, lower, ownSelect, ownViaOrder, timestamps } from "./_common";
import { categories, collections, productVariants, products } from "./catalog";
import { profiles } from "./customers";
import {
  actorTypeEnum,
  cartStatusEnum,
  couponAppliesToEnum,
  couponCombinableEnum,
  couponEligibilityEnum,
  couponKindEnum,
  couponTargetTypeEnum,
  couponValueTypeEnum,
  fulfilmentStatusEnum,
  orderAddressKindEnum,
  orderStatusEnum,
  paymentMethodEnum,
  paymentProviderEnum,
  paymentStatusEnum,
  paymentTxStatusEnum,
  reservationStatusEnum,
  shippingMethodEnum,
  returnPolicyEnum,
} from "./enums";
import { locations } from "./inventory";

/* ---------------------------------------------------------------- coupons */

/** Discounts (code and automatic). Codes live in `coupon_codes`. */
export const coupons = pgTable(
  "coupons",
  {
    id: id(),
    name: text("name").notNull(),
    kind: couponKindEnum("kind").notNull().default("code"),
    valueType: couponValueTypeEnum("value_type").notNull(),
    /** Percent in basis points, or paise for fixed. */
    value: integer("value").notNull().default(0),
    appliesTo: couponAppliesToEnum("applies_to").notNull().default("order"),
    minSubtotalPaise: integer("min_subtotal_paise").notNull().default(0),
    maxDiscountPaise: integer("max_discount_paise"),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    excludeSaleItems: boolean("exclude_sale_items").notNull().default(false),
    customerEligibility: couponEligibilityEnum("customer_eligibility").notNull().default("all"),
    usageLimitTotal: integer("usage_limit_total"),
    usageLimitPerCustomer: integer("usage_limit_per_customer"),
    combinableWith: couponCombinableEnum("combinable_with").notNull().default("none"),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    index("coupons_active_idx").on(t.isActive, t.startsAt, t.endsAt),
    check("coupons_value_non_negative", sql`${t.value} >= 0`),
    check("coupons_percent_range", sql`${t.valueType} <> 'percent' or ${t.value} <= 10000`),
    appAll(),
  ],
).enableRLS();

/** Scope rows with real FKs (ADR review: no uuid[] arrays). Exactly one target per row. */
export const couponTargets = pgTable(
  "coupon_targets",
  {
    id: id(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    targetType: couponTargetTypeEnum("target_type").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("coupon_targets_coupon_idx").on(t.couponId),
    uniqueIndex("coupon_targets_product_idx").on(t.couponId, t.productId).where(sql`${t.productId} is not null`),
    uniqueIndex("coupon_targets_collection_idx").on(t.couponId, t.collectionId).where(sql`${t.collectionId} is not null`),
    uniqueIndex("coupon_targets_category_idx").on(t.couponId, t.categoryId).where(sql`${t.categoryId} is not null`),
    check(
      "coupon_targets_exactly_one",
      sql`(${t.productId} is not null)::int + (${t.collectionId} is not null)::int + (${t.categoryId} is not null)::int = 1`,
    ),
    appAll(),
  ],
).enableRLS();

export const couponCodes = pgTable(
  "coupon_codes",
  {
    id: id(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("coupon_codes_code_lower_idx").on(lower(t.code)), check("coupon_codes_format", sql`${t.code} ~ '^[A-Za-z0-9_-]{3,32}$'`), appAll()],
).enableRLS();

/* ----------------------------------------------------------------- orders */

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 100001, increment: 1 });

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number")
      .notNull()
      .default(sql`'KL-' || nextval('order_number_seq')`),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    fulfilmentStatus: fulfilmentStatusEnum("fulfilment_status").notNull().default("unfulfilled"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    subtotalPaise: integer("subtotal_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    shippingPaise: integer("shipping_paise").notNull().default(0),
    codFeePaise: integer("cod_fee_paise").notNull().default(0),
    giftWrapPaise: integer("gift_wrap_paise").notNull().default(0),
    /** Derived for invoices; prices are GST-inclusive (ADR-21). */
    taxPaise: integer("tax_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    couponCodeId: uuid("coupon_code_id").references(() => couponCodes.id, { onDelete: "set null" }),
    discountSnapshot: jsonb("discount_snapshot"),
    shippingMethod: shippingMethodEnum("shipping_method"),
    shippingEstimateMin: date("shipping_estimate_min"),
    shippingEstimateMax: date("shipping_estimate_max"),
    cartToken: uuid("cart_token"),
    source: text("source").notNull().default("web"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    gaClientId: text("ga_client_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    /** Client-generated per checkout attempt; double submits return the existing order. */
    idempotencyKey: uuid("idempotency_key").notNull(),
    giftWrap: boolean("gift_wrap").notNull().default(false),
    giftMessage: text("gift_message"),
    riskFlags: text("risk_flags").array().notNull().default(sql`'{}'::text[]`),
    needsReview: boolean("needs_review").notNull().default(false),
    placedAt: timestamp("placed_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
    cancelReason: text("cancel_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_order_number_idx").on(t.orderNumber),
    uniqueIndex("orders_idempotency_key_idx").on(t.idempotencyKey),
    index("orders_status_placed_idx").on(t.status, t.placedAt),
    index("orders_profile_idx").on(t.profileId),
    index("orders_guest_email_idx").on(lower(t.guestEmail)),
    check("orders_amounts_non_negative", sql`${t.subtotalPaise} >= 0 and ${t.discountPaise} >= 0 and ${t.shippingPaise} >= 0 and ${t.totalPaise} >= 0`),
    check("orders_has_contact", sql`${t.profileId} is not null or ${t.guestEmail} is not null`),
    check("orders_gift_message_length", sql`${t.giftMessage} is null or length(${t.giftMessage}) <= 200`),
    appAll(),
    ownSelect(t.profileId),
  ],
).enableRLS();

/** Snapshot columns so orders survive catalogue edits. */
export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    variantTitle: text("variant_title"),
    imageUrl: text("image_url"),
    quantity: integer("quantity").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    compareAtPaise: integer("compare_at_paise"),
    discountPaise: integer("discount_paise").notNull().default(0),
    taxRateBp: integer("tax_rate_bp").notNull().default(300),
    taxPaise: integer("tax_paise").notNull().default(0),
    lineTotalPaise: integer("line_total_paise").notNull(),
    hsnCode: text("hsn_code").notNull().default("7117"),
    returnPolicy: returnPolicyEnum("return_policy").notNull().default("returnable"),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    returnedQuantity: integer("returned_quantity").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_fulfilled_within_quantity", sql`${t.fulfilledQuantity} between 0 and ${t.quantity}`),
    appAll(),
    ownViaOrder(t.orderId),
  ],
).enableRLS();

export const orderAddresses = pgTable(
  "order_addresses",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: orderAddressKindEnum("kind").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    landmark: text("landmark"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    stateCode: text("state_code"),
    pincode: text("pincode").notNull(),
    country: text("country").notNull().default("IN"),
  },
  (t) => [uniqueIndex("order_addresses_order_kind_idx").on(t.orderId, t.kind), appAll(), ownViaOrder(t.orderId)],
).enableRLS();

/** Append-only timeline. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data"),
    actorType: actorTypeEnum("actor_type").notNull().default("system"),
    actorId: uuid("actor_id"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt), appAll(), ownViaOrder(t.orderId)],
).enableRLS();

/* --------------------------------------------------------------- payments */

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    amountPaise: integer("amount_paise").notNull(),
    status: paymentTxStatusEnum("status").notNull().default("created"),
    method: text("method"),
    raw: jsonb("raw"),
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    uniqueIndex("payments_provider_payment_id_idx").on(t.provider, t.providerPaymentId).where(sql`${t.providerPaymentId} is not null`),
    check("payments_amount_positive", sql`${t.amountPaise} > 0`),
    appAll(),
  ],
).enableRLS();

/** Webhook idempotency for payment providers. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: id(),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    provider: paymentProviderEnum("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("payment_events_provider_event_idx").on(t.provider, t.providerEventId), appAll()],
).enableRLS();

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: id(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    codeId: uuid("code_id").references(() => couponCodes.id, { onDelete: "set null" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    amountPaise: integer("amount_paise").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("coupon_redemptions_order_coupon_idx").on(t.orderId, t.couponId), index("coupon_redemptions_profile_idx").on(t.profileId), appAll()],
).enableRLS();

/* ------------------------------------------------------------------ carts */

/** Server-side cart (docs/05 §5). Guest carts are keyed by an HttpOnly cookie token. */
export const carts = pgTable(
  "carts",
  {
    id: id(),
    token: uuid("token").notNull().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    couponCodeId: uuid("coupon_code_id").references(() => couponCodes.id, { onDelete: "set null" }),
    status: cartStatusEnum("status").notNull().default("active"),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("carts_token_idx").on(t.token),
    uniqueIndex("carts_active_profile_idx")
      .on(t.profileId)
      .where(sql`${t.profileId} is not null and ${t.status} = 'active'`),
    index("carts_status_updated_idx").on(t.status, t.updatedAt),
    appAll(),
    ownSelect(t.profileId),
  ],
).enableRLS();

export const cartItems = pgTable(
  "cart_items",
  {
    id: id(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    /** Only for "price changed since you added it" notices; never used for totals. */
    pricePaiseAtAdd: integer("price_paise_at_add").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cart_items_cart_variant_idx").on(t.cartId, t.variantId),
    check("cart_items_quantity_range", sql`${t.quantity} between 1 and 10`),
    appAll(),
  ],
).enableRLS();

/* ------------------------------------------------------------ reservations */

/** Stock held during checkout (10-minute TTL, released by cron). */
export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    cartToken: uuid("cart_token"),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    status: reservationStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("inventory_reservations_active_idx").on(t.status, t.expiresAt),
    index("inventory_reservations_variant_idx").on(t.variantId),
    check("inventory_reservations_quantity_positive", sql`${t.quantity} > 0`),
    appAll(),
  ],
).enableRLS();

