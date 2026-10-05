import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { appAll, id, timestamps, tsvector } from "./_common";
import {
  attributeKindEnum,
  categoryGenderEnum,
  collectionKindEnum,
  collectionRuleFieldEnum,
  collectionRuleOperatorEnum,
  externalVideoProviderEnum,
  genderEnum,
  mediaKindEnum,
  mediaRoleEnum,
  productRelationKindEnum,
  productStatusEnum,
  returnPolicyEnum,
  sortKeyEnum,
  variantStatusEnum,
} from "./enums";

/* ------------------------------------------------------------------ media */

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: id(),
    storagePath: text("storage_path").notNull(),
    kind: mediaKindEnum("kind").notNull().default("image"),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    blurhash: text("blurhash"),
    externalProvider: externalVideoProviderEnum("external_provider"),
    externalUrl: text("external_url"),
    createdBy: uuid("created_by"),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("media_assets_storage_path_idx").on(t.storagePath), appAll()],
).enableRLS();

/* ------------------------------------------------------------- categories */

export const categories = pgTable(
  "categories",
  {
    id: id(),
    /** e.g. `women/earrings`; gender roots are `women` / `men`. */
    path: text("path").notNull(),
    slug: text("slug").notNull(),
    gender: categoryGenderEnum("gender").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    titleNoun: text("title_noun").notNull(),
    introMd: text("intro_md").notNull().default(""),
    bodyMd: text("body_md"),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
    imageMediaId: uuid("image_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    noindex: boolean("noindex").notNull().default(false),
    position: integer("position").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_path_idx").on(t.path),
    index("categories_parent_idx").on(t.parentId),
    check("categories_slug_format", sql`${t.slug} ~ '^[a-z0-9-]+$'`),
    appAll(),
  ],
).enableRLS();

/* --------------------------------------------------------------- products */

export const productFamilies = pgTable(
  "product_families",
  {
    id: id(),
    name: text("name").notNull(),
    createdAt: timestamps.createdAt,
  },
  () => [appAll()],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    descriptionMd: text("description_md").notNull().default(""),
    highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
    stylingTips: text("styling_tips").array().notNull().default(sql`'{}'::text[]`),
    status: productStatusEnum("status").notNull().default("draft"),
    gender: genderEnum("gender").notNull(),
    primaryCategoryId: uuid("primary_category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    familyId: uuid("family_id").references(() => productFamilies.id, { onDelete: "set null" }),
    familyOptionLabel: text("family_option_label"),
    /** "Size" | "Length" | null — colour/finish are sibling products (ADR-29). */
    optionName: text("option_name"),
    careMd: text("care_md").notNull().default(""),
    weightGrams: integer("weight_grams"),
    dimensions: text("dimensions"),
    hsnCode: text("hsn_code").notNull().default("7117"),
    gstRateBp: integer("gst_rate_bp").notNull().default(300),
    returnPolicy: returnPolicyEnum("return_policy").notNull().default("returnable"),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    countryOfOrigin: text("country_of_origin").notNull().default("IN"),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords").array().notNull().default(sql`'{}'::text[]`),
    canonicalOverride: text("canonical_override"),
    noindex: boolean("noindex").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortWeight: integer("sort_weight").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
    discontinuedRedirectPath: text("discontinued_redirect_path"),
    /** Maintained by trigger (functions migration). */
    searchVector: tsvector("search_vector"),
    /** Aggregate of product_attribute_values for fast faceting; maintained by trigger. */
    attributeValueIds: uuid("attribute_value_ids").array().notNull().default(sql`'{}'::uuid[]`),
    sales30d: integer("sales_30d").notNull().default(0),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
    ratingCount: integer("rating_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_gender_idx").on(t.status, t.gender),
    index("products_primary_category_idx").on(t.primaryCategoryId),
    index("products_family_idx").on(t.familyId),
    index("products_published_at_idx").on(t.publishedAt),
    index("products_sales_30d_idx").on(t.sales30d),
    index("products_search_vector_idx").using("gin", t.searchVector),
    index("products_attribute_value_ids_idx").using("gin", t.attributeValueIds),
    check("products_slug_format", sql`${t.slug} ~ '^[a-z0-9-]+$'`),
    check("products_gst_rate_range", sql`${t.gstRateBp} between 0 and 10000`),
    check("products_option_name", sql`${t.optionName} is null or ${t.optionName} in ('Size', 'Length')`),
    appAll(),
  ],
).enableRLS();

export const productOptions = pgTable(
  "product_options",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("product_options_product_name_idx").on(t.productId, t.name), appAll()],
).enableRLS();

export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: id(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("product_option_values_option_value_idx").on(t.optionId, t.value), appAll()],
).enableRLS();

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    pricePaise: integer("price_paise").notNull(),
    compareAtPricePaise: integer("compare_at_price_paise"),
    salePricePaise: integer("sale_price_paise"),
    saleStartsAt: timestamp("sale_starts_at", { withTimezone: true, mode: "string" }),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true, mode: "string" }),
    /** Admin only; never rendered. */
    costPricePaise: integer("cost_price_paise"),
    weightGrams: integer("weight_grams"),
    barcode: text("barcode"),
    mediaId: uuid("media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    status: variantStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_variants_sku_idx").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_one_default_idx")
      .on(t.productId)
      .where(sql`${t.isDefault} = true`),
    check("product_variants_price_positive", sql`${t.pricePaise} > 0`),
    check("product_variants_compare_at_gt_price", sql`${t.compareAtPricePaise} is null or ${t.compareAtPricePaise} > ${t.pricePaise}`),
    check("product_variants_sale_le_price", sql`${t.salePricePaise} is null or ${t.salePricePaise} < ${t.pricePaise}`),
    appAll(),
  ],
).enableRLS();

export const variantOptionValues = pgTable(
  "variant_option_values",
  {
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => productOptionValues.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.variantId, t.optionValueId] }), appAll()],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    role: mediaRoleEnum("role").notNull().default("gallery"),
    altText: text("alt_text").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("product_images_product_idx").on(t.productId, t.position),
    uniqueIndex("product_images_one_primary_idx")
      .on(t.productId)
      .where(sql`${t.role} = 'primary'`),
    check("product_images_alt_not_blank", sql`length(trim(${t.altText})) > 0`),
    appAll(),
  ],
).enableRLS();

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("product_categories_category_idx").on(t.categoryId), appAll()],
).enableRLS();

/* ------------------------------------------------------------ collections */

export const collections = pgTable(
  "collections",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    heading: text("heading"),
    introMd: text("intro_md").notNull().default(""),
    bodyMd: text("body_md"),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
    imageMediaId: uuid("image_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    kind: collectionKindEnum("kind").notNull().default("manual"),
    defaultSort: sortKeyEnum("default_sort").notNull().default("featured"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    noindex: boolean("noindex").notNull().default(false),
    isVisible: boolean("is_visible").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("collections_slug_idx").on(t.slug), check("collections_slug_format", sql`${t.slug} ~ '^[a-z0-9-]+$'`), appAll()],
).enableRLS();

export const collectionRules = pgTable(
  "collection_rules",
  {
    id: id(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    field: collectionRuleFieldEnum("field").notNull(),
    operator: collectionRuleOperatorEnum("operator").notNull(),
    value: jsonb("value").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("collection_rules_collection_idx").on(t.collectionId), appAll()],
).enableRLS();

/** Manual membership, and materialised membership for rule collections (ADR-24). */
export const productCollections = pgTable(
  "product_collections",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] }), index("product_collections_product_idx").on(t.productId), appAll()],
).enableRLS();

/* ------------------------------------------------------------- attributes */

export const attributes = pgTable(
  "attributes",
  {
    id: id(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: attributeKindEnum("kind").notNull().default("multi"),
    isFilterable: boolean("is_filterable").notNull().default(true),
    isSpec: boolean("is_spec").notNull().default(true),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("attributes_key_idx").on(t.key), appAll()],
).enableRLS();

export const attributeValues = pgTable(
  "attribute_values",
  {
    id: id(),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributes.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    swatchHex: text("swatch_hex"),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("attribute_values_attribute_slug_idx").on(t.attributeId, t.slug), appAll()],
).enableRLS();

export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attributeValueId: uuid("attribute_value_id")
      .notNull()
      .references(() => attributeValues.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.attributeValueId] }), index("product_attribute_values_value_idx").on(t.attributeValueId), appAll()],
).enableRLS();

export const productRelations = pgTable(
  "product_relations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: productRelationKindEnum("kind").notNull().default("complete_the_look"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.relatedProductId, t.kind] }),
    check("product_relations_not_self", sql`${t.productId} <> ${t.relatedProductId}`),
    appAll(),
  ],
).enableRLS();
