CREATE TYPE "public"."actor_type" AS ENUM('system', 'customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('owner', 'manager', 'catalog_editor', 'content_editor', 'support');--> statement-breakpoint
CREATE TYPE "public"."attribute_kind" AS ENUM('single', 'multi');--> statement-breakpoint
CREATE TYPE "public"."category_gender" AS ENUM('women', 'men');--> statement-breakpoint
CREATE TYPE "public"."collection_kind" AS ENUM('manual', 'rule');--> statement-breakpoint
CREATE TYPE "public"."collection_rule_field" AS ENUM('tag', 'attribute_value', 'category', 'price', 'published_within_days', 'sales_30d_rank', 'gender');--> statement-breakpoint
CREATE TYPE "public"."collection_rule_operator" AS ENUM('eq', 'neq', 'in', 'gte', 'lte');--> statement-breakpoint
CREATE TYPE "public"."consent_channel" AS ENUM('email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('opted_in', 'opted_out');--> statement-breakpoint
CREATE TYPE "public"."consent_topic" AS ENUM('transactional', 'offers', 'new_arrivals', 'journal');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coupon_applies_to" AS ENUM('order', 'products', 'collections', 'categories');--> statement-breakpoint
CREATE TYPE "public"."coupon_combinable" AS ENUM('none', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."coupon_eligibility" AS ENUM('all', 'specific');--> statement-breakpoint
CREATE TYPE "public"."coupon_kind" AS ENUM('code', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."coupon_target_type" AS ENUM('product', 'collection', 'category');--> statement-breakpoint
CREATE TYPE "public"."coupon_value_type" AS ENUM('percent', 'fixed', 'free_shipping', 'bxgy');--> statement-breakpoint
CREATE TYPE "public"."external_video_provider" AS ENUM('youtube', 'vimeo');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_status" AS ENUM('unfulfilled', 'partially_fulfilled', 'fulfilled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('women', 'men', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."homepage_section_kind" AS ENUM('hero', 'category_grid', 'collection_tiles', 'product_carousel', 'editorial', 'journal_teasers', 'testimonials', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."inventory_reason" AS ENUM('receive', 'sale', 'return', 'adjustment', 'damage', 'reservation_consume', 'correction');--> statement-breakpoint
CREATE TYPE "public"."loyalty_tier" AS ENUM('member', 'silver', 'gold');--> statement-breakpoint
CREATE TYPE "public"."loyalty_tx_kind" AS ENUM('earn', 'redeem', 'expire', 'adjust', 'referral');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."media_role" AS ENUM('primary', 'gallery', 'lifestyle', 'detail', 'video');--> statement-breakpoint
CREATE TYPE "public"."nav_target_type" AS ENUM('category', 'collection', 'page', 'post', 'url');--> statement-breakpoint
CREATE TYPE "public"."order_address_kind" AS ENUM('shipping', 'billing');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'payment_failed', 'cod_pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'partially_refunded', 'rto');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'done', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('razorpay', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('razorpay', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cod_pending', 'cod_collected');--> statement-breakpoint
CREATE TYPE "public"."payment_tx_status" AS ENUM('created', 'authorized', 'captured', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."product_relation_kind" AS ENUM('complete_the_look', 'similar');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."redirect_source" AS ENUM('manual', 'slug_change', 'import');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'qualified', 'rewarded', 'void');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'consumed', 'released');--> statement-breakpoint
CREATE TYPE "public"."return_policy" AS ENUM('returnable', 'exchange_only', 'final_sale');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sort_key" AS ENUM('featured', 'newest', 'price-asc', 'price-desc', 'bestselling', 'rating');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100001 CACHE 1;--> statement-breakpoint
CREATE ROLE "kesa_app";--> statement-breakpoint
CREATE TABLE "attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attribute_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"swatch_hex" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attribute_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" "attribute_kind" DEFAULT 'multi' NOT NULL,
	"is_filterable" boolean DEFAULT true NOT NULL,
	"is_spec" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attributes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"slug" text NOT NULL,
	"gender" "category_gender" NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"title_noun" text NOT NULL,
	"intro_md" text DEFAULT '' NOT NULL,
	"body_md" text,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_media_id" uuid,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_format" CHECK ("categories"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collection_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"field" "collection_rule_field" NOT NULL,
	"operator" "collection_rule_operator" NOT NULL,
	"value" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"heading" text,
	"intro_md" text DEFAULT '' NOT NULL,
	"body_md" text,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_media_id" uuid,
	"kind" "collection_kind" DEFAULT 'manual' NOT NULL,
	"default_sort" "sort_key" DEFAULT 'featured' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_format" CHECK ("collections"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"kind" "media_kind" DEFAULT 'image' NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"blurhash" text,
	"external_provider" "external_video_provider",
	"external_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_attribute_values" (
	"product_id" uuid NOT NULL,
	"attribute_value_id" uuid NOT NULL,
	CONSTRAINT "product_attribute_values_product_id_attribute_value_id_pk" PRIMARY KEY("product_id","attribute_value_id")
);
--> statement-breakpoint
ALTER TABLE "product_attribute_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_collections" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_collections_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "product_collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_families" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"media_asset_id" uuid NOT NULL,
	"role" "media_role" DEFAULT 'gallery' NOT NULL,
	"alt_text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_alt_not_blank" CHECK (length(trim("product_images"."alt_text")) > 0)
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_option_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_relations" (
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"kind" "product_relation_kind" DEFAULT 'complete_the_look' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_relations_product_id_related_product_id_kind_pk" PRIMARY KEY("product_id","related_product_id","kind"),
	CONSTRAINT "product_relations_not_self" CHECK ("product_relations"."product_id" <> "product_relations"."related_product_id")
);
--> statement-breakpoint
ALTER TABLE "product_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"price_paise" integer NOT NULL,
	"compare_at_price_paise" integer,
	"sale_price_paise" integer,
	"sale_starts_at" timestamp with time zone,
	"sale_ends_at" timestamp with time zone,
	"cost_price_paise" integer,
	"weight_grams" integer,
	"barcode" text,
	"media_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "variant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_price_positive" CHECK ("product_variants"."price_paise" > 0),
	CONSTRAINT "product_variants_compare_at_gt_price" CHECK ("product_variants"."compare_at_price_paise" is null or "product_variants"."compare_at_price_paise" > "product_variants"."price_paise"),
	CONSTRAINT "product_variants_sale_le_price" CHECK ("product_variants"."sale_price_paise" is null or "product_variants"."sale_price_paise" < "product_variants"."price_paise")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description_md" text DEFAULT '' NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"styling_tips" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"gender" "gender" NOT NULL,
	"primary_category_id" uuid NOT NULL,
	"family_id" uuid,
	"family_option_label" text,
	"option_name" text,
	"care_md" text DEFAULT '' NOT NULL,
	"weight_grams" integer,
	"dimensions" text,
	"hsn_code" text DEFAULT '7117' NOT NULL,
	"gst_rate_bp" integer DEFAULT 300 NOT NULL,
	"return_policy" "return_policy" DEFAULT 'returnable' NOT NULL,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"country_of_origin" text DEFAULT 'IN' NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"canonical_override" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_weight" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"discontinued_redirect_path" text,
	"search_vector" "tsvector",
	"attribute_value_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"sales_30d" integer DEFAULT 0 NOT NULL,
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_format" CHECK ("products"."slug" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "products_gst_rate_range" CHECK ("products"."gst_rate_bp" between 0 and 10000),
	CONSTRAINT "products_option_name" CHECK ("products"."option_name" is null or "products"."option_name" in ('Size', 'Length'))
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "variant_option_values" (
	"variant_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	CONSTRAINT "variant_option_values_variant_id_option_value_id_pk" PRIMARY KEY("variant_id","option_value_id")
);
--> statement-breakpoint
ALTER TABLE "variant_option_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory" (
	"variant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"available" integer GENERATED ALWAYS AS (on_hand - reserved) STORED,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_variant_id_location_id_pk" PRIMARY KEY("variant_id","location_id"),
	CONSTRAINT "inventory_on_hand_non_negative" CHECK ("inventory"."on_hand" >= 0),
	CONSTRAINT "inventory_reserved_non_negative" CHECK ("inventory"."reserved" >= 0),
	CONSTRAINT "inventory_reserved_within_stock" CHECK ("inventory"."reserved" <= "inventory"."on_hand" or "inventory"."allow_backorder")
);
--> statement-breakpoint
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" "inventory_reason" NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"note" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transactions_delta_nonzero" CHECK ("inventory_transactions"."delta" <> 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"label" text,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"state_code" text,
	"pincode" text NOT NULL,
	"country" text DEFAULT 'IN' NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_pincode_format" CHECK ("addresses"."country" <> 'IN' or "addresses"."pincode" ~ '^[1-9][0-9]{5}$')
);
--> statement-breakpoint
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "admin_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"email" text NOT NULL,
	"channel" "consent_channel" NOT NULL,
	"topic" "consent_topic" NOT NULL,
	"status" "consent_status" NOT NULL,
	"source" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"profile_id" uuid,
	"confirm_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"first_name" text,
	"last_name" text,
	"accepts_marketing" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes_internal" text,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"risk_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"total_spent_paise" bigint DEFAULT 0 NOT NULL,
	"last_order_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_phone_format" CHECK ("profiles"."phone" is null or "profiles"."phone" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupon_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"code" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_codes_format" CHECK ("coupon_codes"."code" ~ '^[A-Za-z0-9_-]{3,32}$')
);
--> statement-breakpoint
ALTER TABLE "coupon_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"code_id" uuid,
	"order_id" uuid NOT NULL,
	"profile_id" uuid,
	"amount_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupon_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"target_type" "coupon_target_type" NOT NULL,
	"product_id" uuid,
	"collection_id" uuid,
	"category_id" uuid,
	CONSTRAINT "coupon_targets_exactly_one" CHECK (("coupon_targets"."product_id" is not null)::int + ("coupon_targets"."collection_id" is not null)::int + ("coupon_targets"."category_id" is not null)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "coupon_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "coupon_kind" DEFAULT 'code' NOT NULL,
	"value_type" "coupon_value_type" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"applies_to" "coupon_applies_to" DEFAULT 'order' NOT NULL,
	"min_subtotal_paise" integer DEFAULT 0 NOT NULL,
	"max_discount_paise" integer,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"exclude_sale_items" boolean DEFAULT false NOT NULL,
	"customer_eligibility" "coupon_eligibility" DEFAULT 'all' NOT NULL,
	"usage_limit_total" integer,
	"usage_limit_per_customer" integer,
	"combinable_with" "coupon_combinable" DEFAULT 'none' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_value_non_negative" CHECK ("coupons"."value" >= 0),
	CONSTRAINT "coupons_percent_range" CHECK ("coupons"."value_type" <> 'percent' or "coupons"."value" <= 10000)
);
--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cart_token" uuid,
	"order_id" uuid,
	"status" "reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_positive" CHECK ("inventory_reservations"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "order_address_kind" NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"state_code" text,
	"pincode" text NOT NULL,
	"country" text DEFAULT 'IN' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"actor_type" "actor_type" DEFAULT 'system' NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_id" uuid,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"variant_title" text,
	"image_url" text,
	"quantity" integer NOT NULL,
	"unit_price_paise" integer NOT NULL,
	"compare_at_paise" integer,
	"discount_paise" integer DEFAULT 0 NOT NULL,
	"tax_rate_bp" integer DEFAULT 300 NOT NULL,
	"tax_paise" integer DEFAULT 0 NOT NULL,
	"line_total_paise" integer NOT NULL,
	"hsn_code" text DEFAULT '7117' NOT NULL,
	"return_policy" "return_policy" DEFAULT 'returnable' NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_fulfilled_within_quantity" CHECK ("order_items"."fulfilled_quantity" between 0 and "order_items"."quantity")
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text DEFAULT 'KL-' || nextval('order_number_seq') NOT NULL,
	"profile_id" uuid,
	"guest_email" text,
	"guest_phone" text,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"fulfilment_status" "fulfilment_status" DEFAULT 'unfulfilled' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"subtotal_paise" integer NOT NULL,
	"discount_paise" integer DEFAULT 0 NOT NULL,
	"shipping_paise" integer DEFAULT 0 NOT NULL,
	"cod_fee_paise" integer DEFAULT 0 NOT NULL,
	"gift_wrap_paise" integer DEFAULT 0 NOT NULL,
	"tax_paise" integer DEFAULT 0 NOT NULL,
	"total_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"coupon_code_id" uuid,
	"discount_snapshot" jsonb,
	"shipping_method" text,
	"shipping_estimate_min" date,
	"shipping_estimate_max" date,
	"cart_token" uuid,
	"source" text DEFAULT 'web' NOT NULL,
	"utm" jsonb,
	"ga_client_id" text,
	"ip_hash" text,
	"user_agent" text,
	"idempotency_key" uuid NOT NULL,
	"gift_wrap" boolean DEFAULT false NOT NULL,
	"gift_message" text,
	"risk_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_amounts_non_negative" CHECK ("orders"."subtotal_paise" >= 0 and "orders"."discount_paise" >= 0 and "orders"."shipping_paise" >= 0 and "orders"."total_paise" >= 0),
	CONSTRAINT "orders_has_contact" CHECK ("orders"."profile_id" is not null or "orders"."guest_email" is not null),
	CONSTRAINT "orders_gift_message_length" CHECK ("orders"."gift_message" is null or length("orders"."gift_message") <= 200)
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"amount_paise" integer NOT NULL,
	"status" "payment_tx_status" DEFAULT 'created' NOT NULL,
	"method" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"balance_points" integer DEFAULT 0 NOT NULL,
	"lifetime_points" integer DEFAULT 0 NOT NULL,
	"tier" "loyalty_tier" DEFAULT 'member' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_accounts_balance_non_negative" CHECK ("loyalty_accounts"."balance_points" >= 0)
);
--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"delta_points" integer NOT NULL,
	"kind" "loyalty_tx_kind" NOT NULL,
	"order_id" uuid,
	"expires_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_transactions_delta_nonzero" CHECK ("loyalty_transactions"."delta_points" <> 0)
);
--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"referee_order_id" uuid,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_not_self" CHECK ("referrals"."referrer_id" <> "referrals"."referee_id")
);
--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"profile_id" uuid,
	"order_item_id" uuid,
	"rating" smallint NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"admin_reply" text,
	"admin_reply_at" timestamp with time zone,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_body_length" CHECK (length("reviews"."body") between 10 and 2000)
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"wishlist_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_wishlist_id_product_id_pk" PRIMARY KEY("wishlist_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"share_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishlists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_format" CHECK ("blog_categories"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
ALTER TABLE "blog_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blog_post_products" (
	"post_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "blog_post_products_post_id_product_id_pk" PRIMARY KEY("post_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "blog_post_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body_md" text DEFAULT '' NOT NULL,
	"cover_media_id" uuid,
	"category_id" uuid,
	"author_name" text DEFAULT 'Kesa Lifestyle' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"reading_minutes" integer DEFAULT 3 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_format" CHECK ("blog_posts"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" "homepage_section_kind" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "homepage_sections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"parent_id" uuid,
	"label" text NOT NULL,
	"target_type" "nav_target_type" NOT NULL,
	"category_id" uuid,
	"collection_id" uuid,
	"post_id" uuid,
	"url" text,
	"image_media_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "navigation_items_target_matches_type" CHECK (case "navigation_items"."target_type"
        when 'category' then "navigation_items"."category_id" is not null
        when 'collection' then "navigation_items"."collection_id" is not null
        when 'post' then "navigation_items"."post_id" is not null
        else "navigation_items"."url" is not null end)
);
--> statement-breakpoint
ALTER TABLE "navigation_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "navigation_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "navigation_menus" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" smallint DEFAULT 301 NOT NULL,
	"source" "redirect_source" DEFAULT 'manual' NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_status_code" CHECK ("redirects"."status_code" in (301, 302, 308)),
	CONSTRAINT "redirects_not_loop" CHECK ("redirects"."from_path" <> "redirects"."to_path"),
	CONSTRAINT "redirects_paths_absolute" CHECK ("redirects"."from_path" like '/%' and ("redirects"."to_path" like '/%' or "redirects"."to_path" like 'https://%'))
);
--> statement-breakpoint
ALTER TABLE "redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"title_template" text DEFAULT '%s | Kesa Lifestyle' NOT NULL,
	"default_description" text DEFAULT '' NOT NULL,
	"default_og_media_id" uuid,
	"organization" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"robots_extra" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_settings_single_row" CHECK ("seo_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "seo_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"signature_valid" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_media_id_media_assets_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_rules" ADD CONSTRAINT "collection_rules_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_image_media_id_media_assets_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_value_id_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_category_id_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_family_id_product_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."product_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_option_value_id_product_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_code_id_coupon_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."coupon_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_targets" ADD CONSTRAINT "coupon_targets_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_targets" ADD CONSTRAINT "coupon_targets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_targets" ADD CONSTRAINT "coupon_targets_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_targets" ADD CONSTRAINT "coupon_targets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_code_id_coupon_codes_id_fk" FOREIGN KEY ("coupon_code_id") REFERENCES "public"."coupon_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_profiles_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_order_id_orders_id_fk" FOREIGN KEY ("referee_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_menu_id_navigation_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."navigation_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_navigation_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_image_media_id_media_assets_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_default_og_media_id_media_assets_id_fk" FOREIGN KEY ("default_og_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_values_attribute_slug_idx" ON "attribute_values" USING btree ("attribute_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "attributes_key_idx" ON "attributes" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_path_idx" ON "categories" USING btree ("path");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "collection_rules_collection_idx" ON "collection_rules" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_path_idx" ON "media_assets" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "product_attribute_values_value_idx" ON "product_attribute_values" USING btree ("attribute_value_id");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_collections_product_idx" ON "product_collections" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_one_primary_idx" ON "product_images" USING btree ("product_id") WHERE "product_images"."role" = 'primary';--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_option_value_idx" ON "product_option_values" USING btree ("option_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_product_name_idx" ON "product_options" USING btree ("product_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_one_default_idx" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_status_gender_idx" ON "products" USING btree ("status","gender");--> statement-breakpoint
CREATE INDEX "products_primary_category_idx" ON "products" USING btree ("primary_category_id");--> statement-breakpoint
CREATE INDEX "products_family_idx" ON "products" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "products_published_at_idx" ON "products" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "products_sales_30d_idx" ON "products" USING btree ("sales_30d");--> statement-breakpoint
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "products_attribute_value_ids_idx" ON "products" USING gin ("attribute_value_ids");--> statement-breakpoint
CREATE INDEX "inventory_transactions_variant_idx" ON "inventory_transactions" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_code_idx" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_one_default_idx" ON "locations" USING btree ("is_default") WHERE "locations"."is_default" = true;--> statement-breakpoint
CREATE INDEX "addresses_profile_idx" ON "addresses" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default_shipping_idx" ON "addresses" USING btree ("profile_id") WHERE "addresses"."is_default_shipping" = true and "addresses"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default_billing_idx" ON "addresses" USING btree ("profile_id") WHERE "addresses"."is_default_billing" = true and "addresses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "customer_consents_email_idx" ON "customer_consents" USING btree (lower("email"),"channel","topic","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_lower_idx" ON "newsletter_subscribers" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_token_idx" ON "newsletter_subscribers" USING btree ("confirm_token");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_lower_idx" ON "profiles" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_codes_code_lower_idx" ON "coupon_codes" USING btree (lower("code"));--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order_coupon_idx" ON "coupon_redemptions" USING btree ("order_id","coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_profile_idx" ON "coupon_redemptions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "coupon_targets_coupon_idx" ON "coupon_targets" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_targets_product_idx" ON "coupon_targets" USING btree ("coupon_id","product_id") WHERE "coupon_targets"."product_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_targets_collection_idx" ON "coupon_targets" USING btree ("coupon_id","collection_id") WHERE "coupon_targets"."collection_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_targets_category_idx" ON "coupon_targets" USING btree ("coupon_id","category_id") WHERE "coupon_targets"."category_id" is not null;--> statement-breakpoint
CREATE INDEX "coupons_active_idx" ON "coupons" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_active_idx" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_variant_idx" ON "inventory_reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_addresses_order_kind_idx" ON "order_addresses" USING btree ("order_id","kind");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_status_placed_idx" ON "orders" USING btree ("status","placed_at");--> statement-breakpoint
CREATE INDEX "orders_profile_idx" ON "orders" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "orders_guest_email_idx" ON "orders" USING btree (lower("guest_email"));--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_idx" ON "payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_id_idx" ON "payments" USING btree ("provider","provider_payment_id") WHERE "payments"."provider_payment_id" is not null;--> statement-breakpoint
CREATE INDEX "loyalty_transactions_profile_idx" ON "loyalty_transactions" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_profile_idx" ON "referral_codes" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_code_idx" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee_idx" ON "referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "review_images_review_idx" ON "review_images" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_product_status_idx" ON "reviews" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "reviews_profile_idx" ON "reviews" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_item_idx" ON "reviews" USING btree ("order_item_id") WHERE "reviews"."order_item_id" is not null;--> statement-breakpoint
CREATE INDEX "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_token_idx" ON "wishlists" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_profile_idx" ON "wishlists" USING btree ("profile_id") WHERE "wishlists"."profile_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_share_slug_idx" ON "wishlists" USING btree ("share_slug") WHERE "wishlists"."share_slug" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_categories_slug_idx" ON "blog_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "homepage_sections_position_idx" ON "homepage_sections" USING btree ("position");--> statement-breakpoint
CREATE INDEX "navigation_items_menu_idx" ON "navigation_items" USING btree ("menu_id","parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "navigation_menus_key_idx" ON "navigation_menus" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_from_path_idx" ON "redirects" USING btree ("from_path");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("next_attempt_at") WHERE "outbox_events"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_idx" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "attribute_values" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "attributes" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "categories" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "collection_rules" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "collections" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "media_assets" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_attribute_values" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_categories" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_collections" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_families" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_images" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_option_values" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_options" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_relations" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "product_variants" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "products" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "variant_option_values" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "inventory" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "inventory_transactions" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "locations" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "addresses" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "addresses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "addresses"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "admin_users" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "customer_consents" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "customer_consents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "customer_consents"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "newsletter_subscribers" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "profiles" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "authenticated_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id") WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "coupon_codes" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "coupon_redemptions" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "coupon_targets" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "coupons" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "inventory_reservations" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "order_addresses" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_via_order" ON "order_addresses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.orders o where o.id = "order_addresses"."order_id" and o.profile_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "order_events" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_via_order" ON "order_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.orders o where o.id = "order_events"."order_id" and o.profile_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "order_items" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_via_order" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.orders o where o.id = "order_items"."order_id" and o.profile_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "orders" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "orders"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "payment_events" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "payments" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "loyalty_accounts" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "loyalty_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "loyalty_accounts"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "loyalty_transactions" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "loyalty_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "loyalty_transactions"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "referral_codes" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "referral_codes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "referral_codes"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "referrals" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "referrals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "referrals"."referrer_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "review_images" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "reviews" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "reviews" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "reviews"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "wishlist_items" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_via_wishlist" ON "wishlist_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.wishlists w where w.id = "wishlist_items"."wishlist_id" and w.profile_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "wishlists" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_select_own" ON "wishlists" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "wishlists"."profile_id");--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "blog_categories" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "blog_post_products" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "blog_posts" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "homepage_sections" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "navigation_items" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "navigation_menus" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "redirects" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "seo_settings" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "audit_logs" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "outbox_events" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "settings" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "kesa_app_all" ON "webhook_events" AS PERMISSIVE FOR ALL TO "kesa_app" USING (true) WITH CHECK (true);