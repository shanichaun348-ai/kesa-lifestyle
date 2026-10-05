import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Postgres enums. Values are only ever appended (`ALTER TYPE … ADD VALUE`);
 * renames need a new type (docs/05 §11a). Keep names stable.
 */

export const genderEnum = pgEnum("gender", ["women", "men", "unisex"]);
export const categoryGenderEnum = pgEnum("category_gender", ["women", "men"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);
export const variantStatusEnum = pgEnum("variant_status", ["active", "archived"]);
export const returnPolicyEnum = pgEnum("return_policy", ["returnable", "exchange_only", "final_sale"]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);
export const mediaRoleEnum = pgEnum("media_role", ["primary", "gallery", "lifestyle", "detail", "video"]);
export const externalVideoProviderEnum = pgEnum("external_video_provider", ["youtube", "vimeo"]);
export const collectionKindEnum = pgEnum("collection_kind", ["manual", "rule"]);
export const sortKeyEnum = pgEnum("sort_key", ["featured", "newest", "price-asc", "price-desc", "bestselling", "rating"]);
export const collectionRuleFieldEnum = pgEnum("collection_rule_field", [
  "tag",
  "attribute_value",
  "category",
  "price",
  "published_within_days",
  "sales_30d_rank",
  "gender",
]);
export const collectionRuleOperatorEnum = pgEnum("collection_rule_operator", ["eq", "neq", "in", "gte", "lte"]);
export const attributeKindEnum = pgEnum("attribute_kind", ["single", "multi"]);
export const productRelationKindEnum = pgEnum("product_relation_kind", ["complete_the_look", "similar"]);

export const inventoryReasonEnum = pgEnum("inventory_reason", [
  "receive",
  "sale",
  "return",
  "adjustment",
  "damage",
  "reservation_consume",
  "correction",
]);
export const reservationStatusEnum = pgEnum("reservation_status", ["active", "consumed", "released"]);

export const consentChannelEnum = pgEnum("consent_channel", ["email", "sms", "whatsapp"]);
export const consentTopicEnum = pgEnum("consent_topic", ["transactional", "offers", "new_arrivals", "journal"]);
export const consentStatusEnum = pgEnum("consent_status", ["opted_in", "opted_out"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", ["pending", "subscribed", "unsubscribed"]);
export const adminRoleEnum = pgEnum("admin_role", ["owner", "manager", "catalog_editor", "content_editor", "support"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "payment_failed",
  "cod_pending",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "partially_refunded",
  "rto",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "cod_pending",
  "cod_collected",
]);
export const fulfilmentStatusEnum = pgEnum("fulfilment_status", ["unfulfilled", "partially_fulfilled", "fulfilled", "returned"]);
export const paymentMethodEnum = pgEnum("payment_method", ["razorpay", "cod"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["razorpay", "cod"]);
export const paymentTxStatusEnum = pgEnum("payment_tx_status", ["created", "authorized", "captured", "failed", "refunded"]);
export const orderAddressKindEnum = pgEnum("order_address_kind", ["shipping", "billing"]);
export const actorTypeEnum = pgEnum("actor_type", ["system", "customer", "admin"]);

export const couponKindEnum = pgEnum("coupon_kind", ["code", "automatic"]);
export const couponValueTypeEnum = pgEnum("coupon_value_type", ["percent", "fixed", "free_shipping", "bxgy"]);
export const couponAppliesToEnum = pgEnum("coupon_applies_to", ["order", "products", "collections", "categories"]);
export const couponEligibilityEnum = pgEnum("coupon_eligibility", ["all", "specific"]);
export const couponCombinableEnum = pgEnum("coupon_combinable", ["none", "shipping"]);
export const couponTargetTypeEnum = pgEnum("coupon_target_type", ["product", "collection", "category"]);

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const loyaltyTierEnum = pgEnum("loyalty_tier", ["member", "silver", "gold"]);
export const loyaltyTxKindEnum = pgEnum("loyalty_tx_kind", ["earn", "redeem", "expire", "adjust", "referral"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "qualified", "rewarded", "void"]);

export const contentStatusEnum = pgEnum("content_status", ["draft", "published", "archived"]);
export const homepageSectionKindEnum = pgEnum("homepage_section_kind", [
  "hero",
  "category_grid",
  "collection_tiles",
  "product_carousel",
  "editorial",
  "journal_teasers",
  "testimonials",
  "newsletter",
]);
export const navTargetTypeEnum = pgEnum("nav_target_type", ["category", "collection", "page", "post", "url"]);
export const redirectSourceEnum = pgEnum("redirect_source", ["manual", "slug_change", "import"]);

export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "processing", "done", "failed", "dead"]);
