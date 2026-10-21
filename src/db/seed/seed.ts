/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEVELOPMENT SEED
 *
 * Loads the demo catalogue (src/lib/demo/seed-catalog.ts), navigation,
 * homepage sections, journal posts, a dev coupon and store settings into a
 * database. Pure function over a Drizzle handle so it runs against local
 * Supabase (`pnpm db:seed`) and against PGlite in tests.
 *
 * Never run against production: `run.ts` refuses non-local hosts unless
 * ALLOW_SEED=1 is set explicitly. No customers, orders, reviews or
 * ratings are seeded: those only ever come from real people.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "@/db/schema";
import { demoJournalPosts } from "@/lib/demo/homepage";
import { seedAttributes, seedCategories, seedCollections, seedMediaSources, seedProducts } from "@/lib/demo/seed-catalog";
import { sampleFooterColumns, sampleHeaderMenus } from "@/lib/navigation";

export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export type SeedSummary = {
  attributes: number;
  attributeValues: number;
  categories: number;
  products: number;
  variants: number;
  images: number;
  collections: number;
  navigationItems: number;
  homepageSections: number;
  blogPosts: number;
};

function ruleFor(rule: NonNullable<(typeof seedCollections)[number]["rule"]>): {
  field: (typeof schema.collectionRuleFieldEnum.enumValues)[number];
  operator: (typeof schema.collectionRuleOperatorEnum.enumValues)[number];
  value: unknown;
} {
  switch (rule.type) {
    case "new_arrivals":
      return { field: "published_within_days", operator: "lte", value: rule.withinDays };
    case "bestsellers":
      return { field: "sales_30d_rank", operator: "lte", value: rule.limit };
    case "attribute":
      return { field: "attribute_value", operator: "in", value: { key: rule.key, values: rule.values } };
    case "price_max":
      return { field: "price", operator: "lte", value: rule.paise };
  }
}

export async function seed(db: SeedDb): Promise<SeedSummary> {
  return db.transaction(async (tx) => {
    /* ---------------------------------------------------------- attributes */
    const attributeIdByKey = new Map<string, string>();
    const valueIdByKeySlug = new Map<string, string>();
    for (const [i, attr] of seedAttributes.entries()) {
      const [row] = await tx
        .insert(schema.attributes)
        .values({ key: attr.key, name: attr.name, kind: attr.kind, position: i })
        .returning({ id: schema.attributes.id });
      if (!row) throw new Error(`attribute ${attr.key} not inserted`);
      attributeIdByKey.set(attr.key, row.id);
      const values = await tx
        .insert(schema.attributeValues)
        .values(attr.values.map((v, j) => ({ attributeId: row.id, slug: v.slug, label: v.label, swatchHex: v.swatchHex ?? null, position: j })))
        .returning({ id: schema.attributeValues.id, slug: schema.attributeValues.slug });
      for (const v of values) valueIdByKeySlug.set(`${attr.key}:${v.slug}`, v.id);
    }

    /* ---------------------------------------------------------- categories */
    const categoryIdByPath = new Map<string, string>();
    for (const cat of seedCategories.filter((c) => c.parentPath === null)) {
      const [row] = await tx
        .insert(schema.categories)
        .values({
          path: cat.path,
          slug: cat.slug,
          gender: cat.gender,
          name: cat.name,
          titleNoun: cat.titleNoun,
          introMd: cat.intro,
          bodyMd: cat.body?.join("\n\n") ?? null,
          faq: cat.faq ?? [],
          seoTitle: cat.seoTitle ?? null,
          seoDescription: cat.seoDescription ?? null,
          position: cat.position,
          isVisible: cat.isVisible,
        })
        .returning({ id: schema.categories.id });
      if (!row) throw new Error(`category ${cat.path} not inserted`);
      categoryIdByPath.set(cat.path, row.id);
    }
    for (const cat of seedCategories.filter((c) => c.parentPath !== null)) {
      const parentId = cat.parentPath ? categoryIdByPath.get(cat.parentPath) : undefined;
      const [row] = await tx
        .insert(schema.categories)
        .values({
          path: cat.path,
          slug: cat.slug,
          gender: cat.gender,
          parentId: parentId ?? null,
          name: cat.name,
          titleNoun: cat.titleNoun,
          introMd: cat.intro,
          bodyMd: cat.body?.join("\n\n") ?? null,
          faq: cat.faq ?? [],
          seoTitle: cat.seoTitle ?? null,
          seoDescription: cat.seoDescription ?? null,
          position: cat.position,
          isVisible: cat.isVisible,
        })
        .returning({ id: schema.categories.id });
      if (!row) throw new Error(`category ${cat.path} not inserted`);
      categoryIdByPath.set(cat.path, row.id);
    }

    /* ------------------------------------------------------------ families */
    const familyIdByKey = new Map<string, string>();
    for (const key of new Set(seedProducts.map((p) => p.familyId).filter((f): f is string => Boolean(f)))) {
      const [row] = await tx.insert(schema.productFamilies).values({ name: key }).returning({ id: schema.productFamilies.id });
      if (!row) throw new Error(`family ${key} not inserted`);
      familyIdByKey.set(key, row.id);
    }

    /* ------------------------------------------------------------ location */
    const [location] = await tx
      .insert(schema.locations)
      .values({ code: "MUM-01", name: "Mumbai warehouse", isDefault: true, address: { city: "Mumbai", state: "Maharashtra", pincode: "400001" } })
      .returning({ id: schema.locations.id });
    if (!location) throw new Error("location not inserted");

    /* ------------------------------------------------------------ products */
    const productIdBySlug = new Map<string, string>();
    let variantCount = 0;
    let imageCount = 0;

    for (const p of seedProducts) {
      const primaryCategoryId = categoryIdByPath.get(p.primaryCategoryPath);
      if (!primaryCategoryId) throw new Error(`category ${p.primaryCategoryPath} missing for ${p.slug}`);

      const [product] = await tx
        .insert(schema.products)
        .values({
          slug: p.slug,
          name: p.name,
          shortDescription: p.shortDescription,
          descriptionMd: p.description.join("\n\n"),
          highlights: p.highlights,
          stylingTips: p.stylingTips,
          status: p.status,
          gender: p.gender,
          primaryCategoryId,
          familyId: p.familyId ? (familyIdByKey.get(p.familyId) ?? null) : null,
          familyOptionLabel: p.familyOptionLabel ?? null,
          optionName: p.optionName ?? null,
          careMd: p.care,
          weightGrams: p.weightGrams ?? null,
          dimensions: p.dimensions ?? null,
          hsnCode: p.hsnCode,
          gstRateBp: p.gstRateBp,
          returnPolicy: p.returnPolicy,
          lowStockThreshold: p.lowStockThreshold,
          faq: p.faq ?? [],
          sortWeight: p.sortWeight,
          sales30d: p.sales30d,
          publishedAt: p.publishedAt,
          archivedAt: p.status === "archived" ? p.publishedAt : null,
          discontinuedRedirectPath: p.discontinuedRedirectPath ?? null,
        })
        .returning({ id: schema.products.id });
      if (!product) throw new Error(`product ${p.slug} not inserted`);
      productIdBySlug.set(p.slug, product.id);

      // Categories (primary + extras).
      await tx
        .insert(schema.productCategories)
        .values(
          [...new Set([p.primaryCategoryPath, ...p.categoryPaths])].map((path) => {
            const categoryId = categoryIdByPath.get(path);
            if (!categoryId) throw new Error(`category ${path} missing`);
            return { productId: product.id, categoryId };
          }),
        )
        .onConflictDoNothing();

      // Attribute values.
      const attributeRows: Array<{ productId: string; attributeValueId: string }> = [];
      for (const [key, slugs] of Object.entries(p.attributes)) {
        for (const slug of slugs ?? []) {
          const valueId = valueIdByKeySlug.get(`${key}:${slug}`);
          if (!valueId) throw new Error(`attribute value ${key}:${slug} missing for ${p.slug}`);
          attributeRows.push({ productId: product.id, attributeValueId: valueId });
        }
      }
      if (attributeRows.length > 0) await tx.insert(schema.productAttributeValues).values(attributeRows);

      // Options and variants.
      let optionValueIdByValue = new Map<string, string>();
      if (p.optionName) {
        const [option] = await tx
          .insert(schema.productOptions)
          .values({ productId: product.id, name: p.optionName, position: 0 })
          .returning({ id: schema.productOptions.id });
        if (!option) throw new Error(`option not inserted for ${p.slug}`);
        const values = await tx
          .insert(schema.productOptionValues)
          .values(
            p.variants
              .map((v) => v.optionValue)
              .filter((v): v is string => v !== undefined)
              .map((value, i) => ({ optionId: option.id, value, position: i })),
          )
          .returning({ id: schema.productOptionValues.id, value: schema.productOptionValues.value });
        optionValueIdByValue = new Map(values.map((v) => [v.value, v.id]));
      }

      for (const [i, v] of p.variants.entries()) {
        const [variant] = await tx
          .insert(schema.productVariants)
          .values({
            productId: product.id,
            sku: v.sku,
            pricePaise: v.pricePaise,
            compareAtPricePaise: v.compareAtPaise ?? null,
            weightGrams: p.weightGrams ?? null,
            isDefault: i === 0,
            position: i,
          })
          .returning({ id: schema.productVariants.id });
        if (!variant) throw new Error(`variant ${v.sku} not inserted`);
        variantCount += 1;

        if (v.optionValue !== undefined) {
          const optionValueId = optionValueIdByValue.get(v.optionValue);
          if (!optionValueId) throw new Error(`option value ${v.optionValue} missing for ${v.sku}`);
          await tx.insert(schema.variantOptionValues).values({ variantId: variant.id, optionValueId });
        }

        // Inventory level row, then stock via the ledger (trigger maintains on_hand).
        await tx.insert(schema.inventory).values({ variantId: variant.id, locationId: location.id, lowStockThreshold: p.lowStockThreshold });
        if (v.stock > 0) {
          await tx.insert(schema.inventoryTransactions).values({
            variantId: variant.id,
            locationId: location.id,
            delta: v.stock,
            reason: "receive",
            note: "Development seed",
          });
        }
      }

      // Images: one media asset per file, one product_images row per position.
      const sources = seedMediaSources[p.slug] ?? [];
      for (const [i, image] of p.images.entries()) {
        const source = sources[i];
        if (!source) throw new Error(`media source missing for ${p.slug}#${i}`);
        const [asset] = await tx
          .insert(schema.mediaAssets)
          .values({ storagePath: `products/${p.slug}/${p.slug}-${i + 1}.svg`, kind: "image", mimeType: "image/svg+xml", width: 600, height: 800 })
          .returning({ id: schema.mediaAssets.id });
        if (!asset) throw new Error(`media asset not inserted for ${p.slug}`);
        await tx.insert(schema.productImages).values({
          productId: product.id,
          mediaAssetId: asset.id,
          role: i === 0 ? "primary" : "gallery",
          altText: image.alt,
          position: i,
        });
        imageCount += 1;
      }
    }

    // Complete-the-look relations (second pass, all products exist).
    for (const p of seedProducts) {
      const productId = productIdBySlug.get(p.slug);
      if (!productId || p.completeTheLookSlugs.length === 0) continue;
      const rows = p.completeTheLookSlugs
        .map((slug, i) => ({ slug, relatedProductId: productIdBySlug.get(slug), position: i }))
        .filter((r): r is { slug: string; relatedProductId: string; position: number } => r.relatedProductId !== undefined)
        .map((r) => ({ productId, relatedProductId: r.relatedProductId, kind: "complete_the_look" as const, position: r.position }));
      if (rows.length > 0) await tx.insert(schema.productRelations).values(rows);
    }

    /* --------------------------------------------------------- collections */
    const collectionIdBySlug = new Map<string, string>();
    for (const c of seedCollections) {
      const [row] = await tx
        .insert(schema.collections)
        .values({
          slug: c.slug,
          name: c.name,
          heading: c.heading ?? null,
          introMd: c.intro,
          bodyMd: c.body?.join("\n\n") ?? null,
          faq: c.faq ?? [],
          kind: c.kind,
          defaultSort: c.defaultSort,
          seoTitle: c.seoTitle ?? null,
          seoDescription: c.seoDescription ?? null,
          isVisible: c.isVisible,
          position: c.position,
        })
        .returning({ id: schema.collections.id });
      if (!row) throw new Error(`collection ${c.slug} not inserted`);
      collectionIdBySlug.set(c.slug, row.id);
      if (c.rule) {
        const r = ruleFor(c.rule);
        await tx.insert(schema.collectionRules).values({ collectionId: row.id, field: r.field, operator: r.operator, value: r.value, position: 0 });
      }
      if (c.productSlugs && c.productSlugs.length > 0) {
        await tx.insert(schema.productCollections).values(
          c.productSlugs
            .map((slug, i) => ({ productId: productIdBySlug.get(slug), i }))
            .filter((x): x is { productId: string; i: number } => x.productId !== undefined)
            .map((x) => ({ collectionId: row.id, productId: x.productId, position: x.i })),
        );
      }
    }

    /* ---------------------------------------------------------- navigation */
    let navigationItems = 0;
    const [headerMenu] = await tx.insert(schema.navigationMenus).values({ key: "header", name: "Header" }).returning({ id: schema.navigationMenus.id });
    if (!headerMenu) throw new Error("header menu not inserted");
    for (const [i, menu] of sampleHeaderMenus.entries()) {
      const target = targetFor(menu.href, categoryIdByPath, collectionIdBySlug);
      const [top] = await tx
        .insert(schema.navigationItems)
        .values({ menuId: headerMenu.id, label: menu.label, position: i, ...target })
        .returning({ id: schema.navigationItems.id });
      if (!top) throw new Error(`nav item ${menu.label} not inserted`);
      navigationItems += 1;
      for (const [j, col] of (menu.columns ?? []).entries()) {
        const [group] = await tx
          .insert(schema.navigationItems)
          .values({ menuId: headerMenu.id, parentId: top.id, label: col.heading, position: j, targetType: "url", url: menu.href })
          .returning({ id: schema.navigationItems.id });
        if (!group) throw new Error(`nav group ${col.heading} not inserted`);
        navigationItems += 1;
        for (const [k, link] of col.links.entries()) {
          await tx.insert(schema.navigationItems).values({
            menuId: headerMenu.id,
            parentId: group.id,
            label: link.label,
            position: k,
            ...targetFor(link.href, categoryIdByPath, collectionIdBySlug),
          });
          navigationItems += 1;
        }
      }
    }
    for (const col of sampleFooterColumns) {
      const key = `footer_${col.heading.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const [menu] = await tx.insert(schema.navigationMenus).values({ key, name: `Footer – ${col.heading}` }).returning({ id: schema.navigationMenus.id });
      if (!menu) throw new Error(`footer menu ${key} not inserted`);
      for (const [i, link] of col.links.entries()) {
        await tx.insert(schema.navigationItems).values({ menuId: menu.id, label: link.label, position: i, ...targetFor(link.href, categoryIdByPath, collectionIdBySlug) });
        navigationItems += 1;
      }
    }

    /* ------------------------------------------------------------ homepage */
    const newArrivals = collectionIdBySlug.get("new-arrivals");
    const bestsellers = collectionIdBySlug.get("bestsellers");
    const sections: Array<typeof schema.homepageSections.$inferInsert> = [
      { position: 0, kind: "hero", config: { eyebrow: "New season", title: "Jewellery that completes your look.", primaryHref: "/women/", secondaryHref: "/men/" } },
      { position: 1, kind: "category_grid", config: { gender: "women" } },
      { position: 2, kind: "product_carousel", config: { collectionId: newArrivals ?? null, title: "New arrivals" } },
      { position: 3, kind: "product_carousel", config: { collectionId: bestsellers ?? null, title: "Bestsellers" } },
      { position: 4, kind: "editorial", config: { eyebrow: "Why we make jewellery", href: "/about/" } },
      { position: 5, kind: "journal_teasers", config: { limit: 3 } },
      { position: 6, kind: "newsletter", config: {} },
    ];
    await tx.insert(schema.homepageSections).values(sections);

    /* ---------------------------------------------------------------- blog */
    const [blogCategory] = await tx
      .insert(schema.blogCategories)
      .values([
        { slug: "styling", name: "Styling", position: 0 },
        { slug: "care", name: "Care", position: 1 },
        { slug: "edits", name: "Edits", position: 2 },
      ])
      .returning({ id: schema.blogCategories.id, slug: schema.blogCategories.slug });
    const blogCategoryIdBySlug = new Map<string, string>();
    if (blogCategory) blogCategoryIdBySlug.set(blogCategory.slug, blogCategory.id);
    const allBlogCats = await tx.select({ id: schema.blogCategories.id, slug: schema.blogCategories.slug }).from(schema.blogCategories);
    for (const c of allBlogCats) blogCategoryIdBySlug.set(c.slug, c.id);

    await tx.insert(schema.blogPosts).values(
      demoJournalPosts.map((post, i) => ({
        slug: post.slug.replace(/^demo-/, ""),
        title: post.title,
        excerpt: post.excerpt,
        bodyMd: `${post.excerpt}\n\nDemo copy. Replace with the real article before publishing.`,
        categoryId: blogCategoryIdBySlug.get(post.category.toLowerCase()) ?? null,
        status: "published" as const,
        publishedAt: new Date(Date.UTC(2026, 8, 20 - i)).toISOString(),
        readingMinutes: post.readingMinutes,
      })),
    );

    /* ------------------------------------------------- coupon, seo, settings */
    const [welcome] = await tx
      .insert(schema.coupons)
      .values({ name: "Welcome 10% (dev)", kind: "code", valueType: "percent", value: 1000, minSubtotalPaise: 99900, firstOrderOnly: true, usageLimitPerCustomer: 1 })
      .returning({ id: schema.coupons.id });
    if (welcome) await tx.insert(schema.couponCodes).values({ couponId: welcome.id, code: "WELCOME10" });

    await tx.insert(schema.seoSettings).values({ id: 1, defaultDescription: "Premium fashion jewellery for modern Indian wardrobes." });
    await tx.insert(schema.settings).values([
      { key: "store", value: { name: "Kesa Lifestyle", currency: "INR", orderNumberPrefix: "KL-" } },
      { key: "shipping", value: { freeShippingThresholdPaise: 99900, flatRatePaise: 7900, expressSurchargePaise: 9900, originPincode: "400001", originStateCode: "MH", pendingDecision: "D4" } },
      { key: "cod", value: { enabled: true, capPaise: 250000, feePaise: 2500, pendingDecision: "D4" } },
      { key: "returns", value: { windowDays: 7, pendingDecision: "D7" } },
      { key: "tax", value: { originStateCode: "MH" } },
      { key: "giftWrap", value: { enabled: true, feePaise: 4900 } },
    ]);

    return {
      attributes: attributeIdByKey.size,
      attributeValues: valueIdByKeySlug.size,
      categories: categoryIdByPath.size,
      products: productIdBySlug.size,
      variants: variantCount,
      images: imageCount,
      collections: collectionIdBySlug.size,
      navigationItems,
      homepageSections: sections.length,
      blogPosts: demoJournalPosts.length,
    };
  });
}

type NavTarget =
  | { targetType: "category"; categoryId: string }
  | { targetType: "collection"; collectionId: string }
  | { targetType: "url"; url: string };

function targetFor(href: string, categories: Map<string, string>, collections: Map<string, string>): NavTarget {
  const trimmed = href.replace(/^\/|\/$/g, "");
  const categoryId = categories.get(trimmed);
  if (categoryId) return { targetType: "category", categoryId };
  const collectionSlug = trimmed.startsWith("collections/") ? trimmed.slice("collections/".length) : null;
  const collectionId = collectionSlug ? collections.get(collectionSlug) : undefined;
  if (collectionId) return { targetType: "collection", collectionId };
  return { targetType: "url", url: href };
}
