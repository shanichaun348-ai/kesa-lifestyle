/**
 * Google Product Category (GPC) taxonomy IDs for jewellery.
 * Full taxonomy (65k+ entries):
 *   https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
 *
 * Only the subset relevant to Kesa's product categories is listed here.
 */

export const GPC = {
  /** 188 — Apparel & Accessories > Jewelry */
  JEWELRY: 188,
  /** 189 — Apparel & Accessories > Jewelry > Bracelets */
  BRACELETS: 189,
  /** 191 — Apparel & Accessories > Jewelry > Charms & Pendants */
  CHARMS_PENDANTS: 191,
  /** 193 — Apparel & Accessories > Jewelry > Earrings */
  EARRINGS: 193,
  /** 194 — Apparel & Accessories > Jewelry > Necklaces */
  NECKLACES: 194,
  /** 196 — Apparel & Accessories > Jewelry > Rings */
  RINGS: 196,
  /** 3284 — Apparel & Accessories > Jewelry > Anklets */
  ANKLETS: 3284,
  /** 5122 — Apparel & Accessories > Jewelry > Jewelry Sets */
  JEWELRY_SETS: 5122,
} as const satisfies Record<string, number>;

/**
 * Maps a Kesa category path leaf to the most specific applicable GPC ID.
 * Falls back to the root Jewelry (188) when no closer match exists.
 */
export function categoryPathToGpc(categoryPath: string): number {
  const leaf = categoryPath.split("/").pop() ?? "";
  switch (leaf) {
    case "earrings":
      return GPC.EARRINGS;
    case "necklaces":
      return GPC.NECKLACES;
    case "chains":
      return GPC.NECKLACES; // chains are a type of necklace
    case "rings":
      return GPC.RINGS;
    case "bracelets":
      return GPC.BRACELETS;
    case "bangles":
      return GPC.BRACELETS; // bangles are a type of bracelet
    case "jewellery-sets":
      return GPC.JEWELRY_SETS;
    case "pendants":
      return GPC.CHARMS_PENDANTS;
    case "mangalsutras":
      return GPC.NECKLACES; // a mangalsutra is a necklace
    default:
      return GPC.JEWELRY;
  }
}
