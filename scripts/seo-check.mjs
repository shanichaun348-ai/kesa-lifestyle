#!/usr/bin/env node
/**
 * SEO validation script — static analysis mode.
 *
 * Checks the Next.js App Router source files without requiring a running dev
 * server. For live HTML checks (canonical, og:image, schema validation) pass
 * --live and ensure `pnpm dev` is running.
 *
 * Usage:
 *   pnpm seo-check            # static analysis (always works)
 *   pnpm seo-check --live     # + live fetch checks against localhost:3000
 *
 * Exit code 0 = clean (or only warnings). Exit code 1 = errors found.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const STOREFRONT = join(ROOT, "src", "app", "(storefront)");
const LIVE = process.argv.includes("--live");
const BASE_URL = "http://localhost:3000";

// ─── ANSI ─────────────────────────────────────────────────────────────────
const R = "\x1b[31m";
const Y = "\x1b[33m";
const G = "\x1b[32m";
const B = "\x1b[34m";
const D = "\x1b[2m";
const X = "\x1b[0m";

let errors = 0;
let warnings = 0;

function err(msg) { errors++; console.log(`  ${R}✗${X} ${msg}`); }
function warn(msg) { warnings++; console.log(`  ${Y}⚠${X} ${msg}`); }
function ok(msg) { console.log(`  ${G}✓${X} ${D}${msg}${X}`); }
function section(title) { console.log(`\n${B}▸${X} ${title}`); }

// ─── FILE WALK ────────────────────────────────────────────────────────────
function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

// ─── STATIC ANALYSIS ──────────────────────────────────────────────────────
function analyseStorefront() {
  section("Storefront pages — metadata");

  const pages = walk(STOREFRONT)
    .filter((f) => f.endsWith("page.tsx") && !f.includes("design-system"));

  const titlesSeen = new Map(); // title string → first file
  const descsSeen = new Map();

  for (const file of pages) {
    const rel = relative(ROOT, file).replaceAll(sep, "/");
    const src = readFileSync(file, "utf-8");

    // ── Metadata: must have export metadata or generateMetadata ──────────
    const hasStaticMeta = /export\s+const\s+metadata\s*[:=]/.test(src);
    const hasDynMeta = /export\s+async\s+function\s+generateMetadata\s*\(/.test(src);
    if (!hasStaticMeta && !hasDynMeta) {
      err(`${rel}: no metadata export`);
    }

    // ── H1: every page component must render an <h1 ──────────────────────
    if (!/<h1[\s>]/.test(src)) {
      warn(`${rel}: no <h1 found in source`);
    }

    // ── Images: look for <img without alt attr ───────────────────────────
    const imgMissingAlt = [...src.matchAll(/<img\b[^>]*>/gi)]
      .filter((m) => !/\balt\s*=/.test(m[0]));
    if (imgMissingAlt.length > 0) {
      err(`${rel}: ${imgMissingAlt.length} <img> missing alt`);
    }

    // ── Collect titles for duplicate check ───────────────────────────────
    const titleMatch = src.match(/title:\s*\{[^}]*absolute:\s*["'`]([^"'`]+)["'`]/);
    if (titleMatch?.[1]) {
      const title = titleMatch[1];
      if (titlesSeen.has(title)) {
        err(`${rel}: duplicate title "${title}" (also in ${titlesSeen.get(title)})`);
      } else {
        titlesSeen.set(title, rel);
      }
    }

    // ── Collect descriptions for duplicate check ──────────────────────────
    const descMatch = src.match(/description:\s*["'`]([^"'`]{10,})["'`]/);
    if (descMatch?.[1]) {
      const desc = descMatch[1];
      if (descsSeen.has(desc)) {
        err(`${rel}: duplicate description (also in ${descsSeen.get(desc)})`);
      } else {
        descsSeen.set(desc, rel);
      }
    }
  }

  ok(`Checked ${pages.length} pages`);
}

function analyseProductPages() {
  section("Product pages — structured data");
  const productPage = join(STOREFRONT, "products", "[slug]", "page.tsx");
  try {
    const src = readFileSync(productPage, "utf-8");
    if (/productJsonLd\s*\(/.test(src)) {
      ok("Product schema: productJsonLd present");
    } else {
      err("products/[slug]/page.tsx: productJsonLd not called");
    }
    if (/breadcrumbListJsonLd\s*\(/.test(src)) {
      ok("Product breadcrumb schema: present");
    } else {
      warn("products/[slug]/page.tsx: breadcrumbListJsonLd not called");
    }
  } catch {
    warn("Could not read product page for schema check");
  }
}

function analyseEditorialPages() {
  section("Editorial pages — schema coverage");
  const checks = [
    ["journal/[slug]/page.tsx", "articleJsonLd"],
    ["style-guides/[slug]/page.tsx", "articleJsonLd"],
    ["occasion/[slug]/page.tsx", "collectionPageJsonLd"],
    ["returns-policy/page.tsx", "merchantReturnPolicyJsonLd"],
    ["shipping-policy/page.tsx", "shippingDetailsJsonLd"],
  ];
  for (const [rel, fn] of checks) {
    const file = join(STOREFRONT, ...rel.split("/"));
    try {
      const src = readFileSync(file, "utf-8");
      if (src.includes(fn)) {
        ok(`${rel}: ${fn} present`);
      } else {
        err(`${rel}: ${fn} not found`);
      }
    } catch {
      err(`${rel}: file not found`);
    }
  }
}

function analyseCanonicals() {
  section("Canonical URLs");
  const pages = walk(STOREFRONT)
    .filter((f) => f.endsWith("page.tsx") && !f.includes("design-system"));

  let hasCan = 0;
  let noCan = 0;
  const noCanFiles = [];
  for (const file of pages) {
    const src = readFileSync(file, "utf-8");
    const hasDynMeta = /export\s+async\s+function\s+generateMetadata/.test(src);
    const hasStaticCan = /alternates:\s*\{[^}]*canonical/.test(src);
    const hasDynCan = /canonicalHref/.test(src) || hasStaticCan;
    if (!hasDynMeta && !hasStaticCan) {
      noCan++;
      noCanFiles.push(relative(ROOT, file).replaceAll(sep, "/"));
    } else {
      hasCan++;
    }
  }
  if (noCan > 0) {
    for (const f of noCanFiles) warn(`${f}: no static canonical`);
  }
  ok(`${hasCan}/${pages.length} pages have canonical`);
}

function analyseInternalLinks() {
  section("Internal linking — editorial pages");
  const editorialFiles = [
    join(STOREFRONT, "journal", "[slug]", "page.tsx"),
    join(STOREFRONT, "style-guides", "[slug]", "page.tsx"),
    join(STOREFRONT, "occasion", "[slug]", "page.tsx"),
  ];
  for (const file of editorialFiles) {
    const rel = relative(ROOT, file).replaceAll(sep, "/");
    try {
      const src = readFileSync(file, "utf-8");
      const hasProductLinks = /\/products\//.test(src);
      const hasCategoryLinks = /relatedCategoryPath/.test(src);
      if (hasProductLinks) ok(`${rel}: links to products`);
      else warn(`${rel}: no product links found`);
      if (hasCategoryLinks) ok(`${rel}: links to categories`);
      else warn(`${rel}: no category links found`);
    } catch {
      err(`${rel}: file not found`);
    }
  }
}

function checkOrphanRoutes() {
  section("Orphan pages (not linked from sitemap.ts)");
  const sitemapFile = join(ROOT, "src", "app", "sitemap.ts");
  const sitemapSrc = readFileSync(sitemapFile, "utf-8");
  const routes = [
    ["/journal/", "journal"],
    ["/style-guides/", "style-guides"],
    ["/occasion/", "occasion"],
    ["/returns-policy/", "returns-policy"],
    ["/shipping-policy/", "shipping-policy"],
  ];
  for (const [urlPattern, label] of routes) {
    if (sitemapSrc.includes(urlPattern)) {
      ok(`${label} in sitemap`);
    } else {
      err(`${label}: not found in sitemap.ts`);
    }
  }
}

function checkRobots() {
  section("robots.ts — blocked paths");
  const robotsFile = join(ROOT, "src", "app", "robots.ts");
  try {
    const src = readFileSync(robotsFile, "utf-8");
    const blocked = ["/cart", "/checkout", "/account", "/admin", "/api", "/search"];
    for (const path of blocked) {
      if (src.includes(path)) ok(`${path} is disallowed`);
      else warn(`${path} not found in robots.ts disallow list`);
    }
  } catch {
    err("src/app/robots.ts not found");
  }
}

function checkRedirects() {
  section("next.config.ts — redirects");
  const configFile = join(ROOT, "next.config.ts");
  const src = readFileSync(configFile, "utf-8");
  if (src.includes("/style/:slug")) {
    ok("/style/:slug → /style-guides/:slug redirect present");
  } else {
    err("next.config.ts: /style/:slug redirect not found");
  }
}

// ─── LIVE CHECKS ──────────────────────────────────────────────────────────
async function liveChecks() {
  section("Live HTML checks (localhost:3000)");

  const testUrls = [
    "/",
    "/journal/",
    "/journal/demo-how-to-care-for-gold-plated-jewellery/",
    "/style-guides/",
    "/style-guides/jewellery-for-saree/",
    "/occasion/",
    "/occasion/wedding-jewellery/",
    "/returns-policy/",
    "/shipping-policy/",
    "/women/earrings/",
    "/products/pearl-stud-earrings/",
  ];

  let livePassed = 0;
  let liveFailed = 0;

  for (const url of testUrls) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, { signal: AbortSignal.timeout(5000) });
      const html = await res.text();

      const issues = [];

      // <title>
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (!titleMatch) issues.push("missing <title>");
      else if (titleMatch[1].trim() === "") issues.push("empty <title>");

      // <meta name="description">
      if (!/<meta\s+name=["']description["']/i.test(html)) issues.push("missing meta description");

      // <link rel="canonical">
      if (!/<link[^>]+rel=["']canonical["']/i.test(html)) issues.push("missing canonical");

      // <h1>
      if (!/<h1[\s>]/i.test(html)) issues.push("missing <h1>");

      // <img alt="">
      const badImgs = [...html.matchAll(/<img\b[^>]*alt=["']["'][^>]*>/gi)];
      if (badImgs.length > 0) issues.push(`${badImgs.length} empty alt`);

      if (issues.length === 0) {
        ok(`${url}`);
        livePassed++;
      } else {
        issues.forEach((i) => err(`${url}: ${i}`));
        liveFailed++;
      }
    } catch (e) {
      if (e.name === "TimeoutError" || e.code === "ECONNREFUSED") {
        err(`${url}: server not responding — is pnpm dev running?`);
      } else {
        err(`${url}: ${e.message}`);
      }
      liveFailed++;
    }
  }

  console.log(`\n  Live: ${livePassed} passed, ${liveFailed} failed`);
}

// ─── RUN ──────────────────────────────────────────────────────────────────
console.log(`\n${B}Kesa Lifestyle — SEO Check${X}`);
console.log(`Mode: ${LIVE ? "static + live" : "static analysis"}\n`);

analyseStorefront();
analyseProductPages();
analyseEditorialPages();
analyseCanonicals();
analyseInternalLinks();
checkOrphanRoutes();
checkRobots();
checkRedirects();

if (LIVE) await liveChecks();

console.log("\n" + "─".repeat(50));
if (errors > 0) {
  console.log(`${R}${errors} error(s)${X}, ${Y}${warnings} warning(s)${X}\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${G}0 errors${X}, ${Y}${warnings} warning(s)${X}\n`);
} else {
  console.log(`${G}All checks passed.${X}\n`);
}
