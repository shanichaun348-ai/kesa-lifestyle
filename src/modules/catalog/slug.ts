/**
 * Product URL slugs: lowercase words joined by single hyphens, at most
 * `MAX_SLUG_LENGTH` characters. The storefront, the cards API and the
 * homepage "look" config all refuse anything longer, so the admin must
 * never create one.
 */
export const MAX_SLUG_LENGTH = 120;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercase, hyphenated, and cut at a word boundary so it never exceeds the limit. */
export function slugify(text: string, max: number = MAX_SLUG_LENGTH): string {
  const raw = text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max + 1);
  const atBoundary = cut.lastIndexOf("-");
  return (atBoundary > 0 ? cut.slice(0, atBoundary) : cut.slice(0, max)).replace(/-+$/g, "");
}

/** The reason a slug is unusable, or null when it is fine. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter a URL slug, e.g. gold-hoop-earrings.";
  if (slug.length > MAX_SLUG_LENGTH) return `The URL slug is ${slug.length} characters; keep it under ${MAX_SLUG_LENGTH}. Use a few words from the name, not the description.`;
  if (!SLUG_PATTERN.test(slug)) return "Slug must be lowercase letters, numbers and single hyphens, e.g. gold-hoop-earrings.";
  return null;
}
