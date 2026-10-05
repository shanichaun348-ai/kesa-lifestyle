/**
 * Catalogue domain types. These mirror the Postgres entities in
 * docs/05_DATABASE_DESIGN.md closely enough that the Drizzle-backed
 * repository can map rows onto them without changing the UI.
 */

export type Gender = "women" | "men" | "unisex";
export type CategoryGender = "women" | "men";

export const ATTRIBUTE_KEYS = ["material", "finish", "color", "occasion", "style"] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export type AttributeValue = {
  slug: string;
  label: string;
  swatchHex?: string | undefined;
};

export type AttributeDefinition = {
  key: AttributeKey;
  name: string;
  kind: "single" | "multi";
  values: AttributeValue[];
};

export type ImageRef = {
  /** Public URL. Product media live under `/media/products/{slug}/…` (ADR-30). */
  src: string;
  alt: string;
  /** Local SVG placeholders bypass the optimiser; real photos never set this. */
  unoptimized?: boolean | undefined;
};

/**
 * Product video. `hosted` is a self-hosted MP4/WebM served from `/media`;
 * `youtube` is loaded only after the customer taps the poster, so no
 * third-party script runs on page load (docs/12 §4).
 */
export type ProductVideo =
  | { kind: "hosted"; src: string; poster: ImageRef; title: string; durationSeconds?: number | undefined }
  | { kind: "youtube"; videoId: string; poster: ImageRef; title: string };

export type FaqItem = { question: string; answer: string };

export type Category = {
  id: string;
  /** URL path without slashes, e.g. `women/earrings`; gender roots are `women` / `men`. */
  path: string;
  slug: string;
  gender: CategoryGender;
  parentPath: string | null;
  name: string;
  /** Plural noun used in titles, e.g. "Earrings for Women". */
  titleNoun: string;
  intro: string;
  body?: string[] | undefined;
  faq?: FaqItem[] | undefined;
  image?: ImageRef | undefined;
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  position: number;
  isVisible: boolean;
};

export type CollectionRule =
  | { type: "new_arrivals"; withinDays: number }
  | { type: "bestsellers"; limit: number }
  | { type: "attribute"; key: AttributeKey; values: string[] }
  | { type: "price_max"; paise: number };

export type Collection = {
  id: string;
  slug: string;
  name: string;
  heading?: string | undefined;
  intro: string;
  body?: string[] | undefined;
  faq?: FaqItem[] | undefined;
  image?: ImageRef | undefined;
  kind: "manual" | "rule";
  rule?: CollectionRule | undefined;
  productSlugs?: string[] | undefined;
  defaultSort: SortKey;
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  isVisible: boolean;
  position: number;
};

export type ProductVariant = {
  sku: string;
  /** Option value label, e.g. "12" for a ring size or "20 inch" for a chain. */
  optionValue?: string | undefined;
  pricePaise: number;
  compareAtPaise?: number | undefined;
  stock: number;
};

export type ReturnPolicy = "returnable" | "exchange_only" | "final_sale";

export type Product = {
  /** Internal id. Never appears in a URL; slugs are the public identity. */
  id: string;
  slug: string;
  name: string;
  gender: Gender;
  status: "draft" | "active" | "archived";
  primaryCategoryPath: string;
  categoryPaths: string[];
  tags: string[];
  familyId?: string | undefined;
  familyOptionLabel?: string | undefined;
  attributes: Partial<Record<AttributeKey, string[]>>;
  /** Option dimension for variants; colour/finish are sibling products (ADR-29). */
  optionName?: "Size" | "Length" | undefined;
  variants: ProductVariant[];
  images: ImageRef[];
  videos?: ProductVideo[] | undefined;
  shortDescription: string;
  description: string[];
  highlights: string[];
  stylingTips: string[];
  care: string;
  weightGrams?: number | undefined;
  dimensions?: string | undefined;
  hsnCode: string;
  gstRateBp: number;
  returnPolicy: ReturnPolicy;
  /** Stock at or below this shows "Only N left". */
  lowStockThreshold: number;
  /** Manually curated "Complete the look" products, in display order. */
  completeTheLookSlugs: string[];
  faq?: FaqItem[] | undefined;
  /** Where an archived product sends visitors (admin choice; default primary category). */
  discontinuedRedirectPath?: string | undefined;
  publishedAt: string;
  sales30d: number;
  /** Set only from the reviews table; never seeded. */
  rating?: { value: number; count: number } | undefined;
  sortWeight: number;
};

/* ---------------------------------------------------------------- listing */

export const SORT_KEYS = ["featured", "newest", "price-asc", "price-desc", "bestselling", "rating"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const PRICE_BUCKETS = [
  { slug: "under-500", label: "Under ₹500", minPaise: 0, maxPaise: 49999 },
  { slug: "500-999", label: "₹500 – ₹999", minPaise: 50000, maxPaise: 99999 },
  { slug: "1000-1999", label: "₹1,000 – ₹1,999", minPaise: 100000, maxPaise: 199999 },
  { slug: "2000-and-above", label: "₹2,000 and above", minPaise: 200000, maxPaise: Number.MAX_SAFE_INTEGER },
] as const;

export const FACET_KEYS = [...ATTRIBUTE_KEYS, "price", "availability"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

export type ListingFilters = Partial<Record<FacetKey, string[]>>;

export type ListingParams = {
  filters: ListingFilters;
  /** `null` means the scope's default sort; it is never written to the URL. */
  sort: SortKey | null;
  page: number;
};

export type ListingScope =
  | { kind: "category"; path: string }
  | { kind: "collection"; slug: string };

export type FacetValueResult = {
  slug: string;
  label: string;
  count: number;
  selected: boolean;
  swatchHex?: string | undefined;
};

export type FacetResult = {
  key: FacetKey;
  label: string;
  values: FacetValueResult[];
};

export type ListingResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: SortKey;
  facets: FacetResult[];
};

export const PAGE_SIZE = 24;
