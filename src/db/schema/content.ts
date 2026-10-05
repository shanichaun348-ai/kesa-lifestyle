import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { appAll, id, timestamps } from "./_common";
import { categories, collections, mediaAssets, products } from "./catalog";
import { contentStatusEnum, homepageSectionKindEnum, navTargetTypeEnum, redirectSourceEnum } from "./enums";

/* ------------------------------------------------------------------- blog */

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("blog_categories_slug_idx").on(t.slug), check("blog_categories_slug_format", sql`${t.slug} ~ '^[a-z0-9-]+$'`), appAll()],
).enableRLS();

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    bodyMd: text("body_md").notNull().default(""),
    coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default("Kesa Lifestyle"),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    readingMinutes: integer("reading_minutes").notNull().default(3),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    noindex: boolean("noindex").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("blog_posts_slug_idx").on(t.slug),
    index("blog_posts_status_published_idx").on(t.status, t.publishedAt),
    index("blog_posts_category_idx").on(t.categoryId),
    check("blog_posts_slug_format", sql`${t.slug} ~ '^[a-z0-9-]+$'`),
    appAll(),
  ],
).enableRLS();

export const blogPostProducts = pgTable(
  "blog_post_products",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.productId] }), appAll()],
).enableRLS();

/* --------------------------------------------------------------- homepage */

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: id(),
    position: integer("position").notNull().default(0),
    kind: homepageSectionKindEnum("kind").notNull(),
    /** Validated per kind by Zod in the content module before write. */
    config: jsonb("config").notNull().default({}),
    isVisible: boolean("is_visible").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (t) => [index("homepage_sections_position_idx").on(t.position), appAll()],
).enableRLS();

/* ------------------------------------------------------------- navigation */

export const navigationMenus = pgTable(
  "navigation_menus",
  {
    id: id(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("navigation_menus_key_idx").on(t.key), appAll()],
).enableRLS();

export const navigationItems = pgTable(
  "navigation_items",
  {
    id: id(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => navigationMenus.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => navigationItems.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    targetType: navTargetTypeEnum("target_type").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => blogPosts.id, { onDelete: "cascade" }),
    /** Internal path or external URL for `page` / `url` targets. */
    url: text("url"),
    imageMediaId: uuid("image_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("navigation_items_menu_idx").on(t.menuId, t.parentId, t.position),
    check(
      "navigation_items_target_matches_type",
      sql`case ${t.targetType}
        when 'category' then ${t.categoryId} is not null
        when 'collection' then ${t.collectionId} is not null
        when 'post' then ${t.postId} is not null
        else ${t.url} is not null end`,
    ),
    appAll(),
  ],
).enableRLS();

/* -------------------------------------------------------------------- seo */

export const redirects = pgTable(
  "redirects",
  {
    id: id(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    statusCode: smallint("status_code").notNull().default(301),
    source: redirectSourceEnum("source").notNull().default("manual"),
    hits: integer("hits").notNull().default(0),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true, mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("redirects_from_path_idx").on(t.fromPath),
    check("redirects_status_code", sql`${t.statusCode} in (301, 302, 308)`),
    check("redirects_not_loop", sql`${t.fromPath} <> ${t.toPath}`),
    check("redirects_paths_absolute", sql`${t.fromPath} like '/%' and (${t.toPath} like '/%' or ${t.toPath} like 'https://%')`),
    appAll(),
  ],
).enableRLS();

/** Single-row global SEO defaults (ADR review: per-entity SEO lives on the entity). */
export const seoSettings = pgTable(
  "seo_settings",
  {
    id: integer("id").primaryKey().default(1),
    titleTemplate: text("title_template").notNull().default("%s | Kesa Lifestyle"),
    defaultDescription: text("default_description").notNull().default(""),
    defaultOgMediaId: uuid("default_og_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    organization: jsonb("organization").$type<{ sameAs?: string[]; contactPoint?: Record<string, string> }>().notNull().default({}),
    robotsExtra: text("robots_extra"),
    updatedAt: timestamps.updatedAt,
  },
  (t) => [check("seo_settings_single_row", sql`${t.id} = 1`), appAll()],
).enableRLS();
