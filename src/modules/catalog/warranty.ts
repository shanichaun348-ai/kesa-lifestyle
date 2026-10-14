/**
 * Optional warranty on a product, chosen by the admin (3, 6, 9 or 12 months).
 * It is kept as a hidden tag (`warranty:6`) so it needs no extra column and
 * survives every other edit. No tag means no warranty, and the storefront
 * shows nothing.
 */
export const WARRANTY_TAG_PREFIX = "warranty:";
export const WARRANTY_MONTHS = [3, 6, 9, 12] as const;
export type WarrantyMonths = (typeof WARRANTY_MONTHS)[number];

export function isWarrantyMonths(value: number): value is WarrantyMonths {
  return (WARRANTY_MONTHS as readonly number[]).includes(value);
}

/** The warranty set on a product, or undefined when the admin has not added one. */
export function warrantyMonths(tags: readonly string[]): WarrantyMonths | undefined {
  for (const tag of tags) {
    if (!tag.startsWith(WARRANTY_TAG_PREFIX)) continue;
    const months = Number(tag.slice(WARRANTY_TAG_PREFIX.length));
    if (isWarrantyMonths(months)) return months;
  }
  return undefined;
}

/** The tags with the warranty replaced (or removed when `months` is undefined); other tags are kept. */
export function withWarrantyTag(tags: readonly string[], months: WarrantyMonths | undefined): string[] {
  const kept = tags.filter((t) => !t.startsWith(WARRANTY_TAG_PREFIX));
  return months === undefined ? kept : [...kept, `${WARRANTY_TAG_PREFIX}${months}`];
}

export function warrantyLabel(months: WarrantyMonths): string {
  return `${months}-month warranty`;
}
