/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — OCCASION LANDING PAGES
 *
 * Intent-worthy occasion pages with real content. These are the pages that
 * replace indexed facet URLs (ADR-22 §5): instead of
 * /women/?occasion=wedding indexing as a thin facet URL, a curated
 * /occasion/wedding-jewellery/ page with full copy, products and FAQ is
 * indexed and the facet URL gets noindex.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { FaqItem, ImageRef } from "@/modules/catalog/types";

export type OccasionBodySection = {
  heading: string;
  content: string[];
};

export type OccasionPage = {
  slug: string;
  /** Short name for navigation and breadcrumbs. */
  name: string;
  heading: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  body: OccasionBodySection[];
  featuredProductSlugs: string[];
  relatedCategoryPaths: string[];
  relatedOccasionSlugs: string[];
  faq: FaqItem[];
  image: ImageRef;
};

const ph = (n: 1 | 2, alt: string): ImageRef => ({
  src: `/placeholders/editorial-${n}.svg`,
  alt,
  unoptimized: true,
});

export const seedOccasionPages: OccasionPage[] = [
  {
    slug: "wedding-jewellery",
    name: "Wedding Jewellery",
    heading: "Wedding Jewellery for Every Ceremony",
    seoTitle: "Wedding Jewellery Online | Kesa Lifestyle",
    seoDescription:
      "Shop wedding jewellery for brides and guests. Kundan sets, chandbalis, pearl necklaces, bangles and more. Anti-tarnish, skin-friendly, free shipping over ₹999.",
    intro:
      "Jewellery for weddings has to do two things: look right in photographs and feel comfortable through hours of ceremony. These pieces are curated for both.",
    body: [
      {
        heading: "For the bride",
        content: [
          "Bridal jewellery anchors the whole look. A kundan choker or a pearl necklace-and-earring set is a complete bridal statement on its own. If the outfit is heavily embroidered, let the earrings be the focal point — chandbalis and jhumkas that frame the face photograph better than a necklace that competes with the blouse work.",
          "Plan jewellery last, after the outfit is confirmed. Map each piece to the ceremony: what you wear for the mehndi does not need to be what you wear for the pheras.",
        ],
      },
      {
        heading: "For wedding guests",
        content: [
          "The guest rule is simple: look dressed without outshining the occasion. One statement piece — earrings or a necklace, not both — is the right register for most wedding contexts.",
          "Pearl drop earrings work with sarees, anarkalis and Western gowns alike. A simple kundan necklace or a set of slim gold-tone bangles completes a festive outfit without requiring co-ordination.",
        ],
      },
      {
        heading: "Bangles and the wrist stack",
        content: [
          "Bangles are central to Indian bridal jewellery. A set of four to eight bangles on one wrist, mixed plain and textured, is traditional. For guests, three to six slim bangles is a dressed-up without-trying look.",
          "Pair the bangle stack with a cuff or a chain bracelet on the other wrist rather than on the same wrist — the two categories read as different visual elements.",
        ],
      },
    ],
    featuredProductSlugs: [
      "kundan-necklace-earring-set",
      "statement-chandbali-earrings",
      "kundan-choker-necklace",
      "pearl-necklace-earring-set",
      "slim-stackable-bangles-set-of-4",
      "pearl-drop-earrings-gold-tone",
      "pearl-bangle-gold-tone",
    ],
    relatedCategoryPaths: [
      "women/jewellery-sets",
      "women/earrings",
      "women/necklaces",
      "women/bangles",
    ],
    relatedOccasionSlugs: ["festive-jewellery", "gifting"],
    faq: [
      {
        question: "What jewellery is appropriate for a wedding guest?",
        answer:
          "One statement piece — earrings or a necklace — with complementary minimal pieces. Pearl drops, a simple choker or a set of slim bangles all read appropriately festive without competing with the bridal look.",
      },
      {
        question: "Can I wear plated jewellery to a wedding?",
        answer:
          "Yes. Anti-tarnish plated jewellery holds its finish through a full day and looks identical to gold in photographs. The key is choosing pieces with a thick, quality plating and keeping them away from perfume and sweat.",
      },
      {
        question: "What jewellery goes with a lehenga?",
        answer:
          "Map the lehenga's neckline first. A high neckline (sweetheart, high square) works best with drop earrings and no necklace. A lower neckline has room for a choker or statement necklace. Keep the bangles consistent with the embroidery weight — plain with heavy embroidery, textured with plain fabric.",
      },
    ],
    image: ph(2, "Placeholder: wedding jewellery collection — kundan set and pearl pieces"),
  },
  {
    slug: "office-jewellery",
    name: "Office Jewellery",
    heading: "Jewellery for Work and Professional Settings",
    seoTitle: "Office Wear Jewellery | Minimal & Polished | Kesa Lifestyle",
    seoDescription:
      "Minimal jewellery for office and professional wear. Studs, fine chains, slim bracelets and rings that look polished without distracting. Anti-tarnish, skin-friendly.",
    intro:
      "Office jewellery should be present enough to look considered but quiet enough for meetings and video calls. These pieces hit that register.",
    body: [
      {
        heading: "The minimal formula",
        content: [
          "A pair of small studs or slim hoops, one delicate necklace and one thin bracelet covers almost any professional setting. Keep everything the same metal tone — mixed metals read less intentional in a work context.",
          "On video calls, your face and upper chest are the visible area. Earrings and a necklace at the collarbone level are what read. Save the stacked rings and multiple bracelets for in-person occasions.",
        ],
      },
      {
        heading: "What works in every industry",
        content: [
          "Pearl studs and plain metal studs are universally appropriate. Fine pendant chains and delicate chokers at the collarbone. A slim chain bracelet or one thin bangle. One simple ring, or a minimal stackable set on one hand.",
          "These choices are correct in law firms, creative agencies, hospitals and tech companies alike. The scale is neutral; you read as polished rather than fashionable.",
        ],
      },
      {
        heading: "Dressing up from the base",
        content: [
          "Add one piece to the base formula to shift from daily-work to work-event or dinner-after. Swap studs for small hoops. Add a second necklace at a different length. Switch to a slightly bolder bracelet.",
          "The principle is additive: start with the minimal formula and add one thing rather than starting from scratch for each context.",
        ],
      },
    ],
    featuredProductSlugs: [
      "pearl-stud-earrings",
      "minimal-huggie-hoops-gold-tone",
      "fine-pendant-chain-gold-tone",
      "stackable-band-ring-set",
      "fine-curb-chain-bracelet",
      "open-cuff-bracelet-silver-tone",
      "thin-threader-earrings-silver-tone",
    ],
    relatedCategoryPaths: [
      "women/earrings",
      "women/necklaces",
      "women/rings",
      "women/bracelets",
    ],
    relatedOccasionSlugs: ["daily-wear", "gifting"],
    faq: [
      {
        question: "What earrings are appropriate for a professional setting?",
        answer:
          "Small studs, minimal hoops up to 20 mm diameter, and slim linear drops. Anything that moves or makes sound is best left for evenings; movement is distracting in meetings.",
      },
      {
        question: "Is gold or silver better for office wear?",
        answer:
          "Both are equally appropriate. Choose based on your skin tone and what you already wear — warm skin tones often look better in gold, cool skin tones in silver. The consistency across pieces (not the colour itself) is what makes it look intentional.",
      },
    ],
    image: ph(1, "Placeholder: minimal jewellery for office wear on a neutral background"),
  },
  {
    slug: "festive-jewellery",
    name: "Festive Jewellery",
    heading: "Festive Jewellery for Every Celebration",
    seoTitle: "Festive Jewellery Online | Kesa Lifestyle",
    seoDescription:
      "Shop festive jewellery for Diwali, Navratri, Eid and every celebration. Statement earrings, bangles, necklace sets and more under ₹2,999.",
    intro:
      "Festive dressing is the context where statement jewellery earns its place. These pieces are chosen for the occasions that deserve them.",
    body: [
      {
        heading: "Statement earrings for festivals",
        content: [
          "Jhumkas and chandbalis are the quintessential festive earrings — they move, they catch the light, and they work with every festive outfit from a simple cotton kurta to a silk saree.",
          "For a more contemporary festive look: long drops, geometric dangles or structured drops in gold or oxidised finishes. These read festive without reading traditional if your outfit is fusion or contemporary.",
        ],
      },
      {
        heading: "Necklaces for occasion dressing",
        content: [
          "A choker or collar necklace is the most festive necklace length. It sits close to the neckline, frames the face and photographs well. For outfits with a higher neckline, a long chain or a matinee-length pendant chain sits lower and remains visible over the fabric.",
          "Kundan and pearl are the festive classics for a reason — both carry visual weight, both catch the light, and both suit multiple outfit types. A simple kundan piece reads festive in a way that plain metal does not.",
        ],
      },
      {
        heading: "The bangle stack",
        content: [
          "Festive occasions are the right context for a proper bangle stack. Four to eight slim bangles on one wrist, or a set of three with one textured kada, is a complete festive look for the wrist without any further additions.",
        ],
      },
    ],
    featuredProductSlugs: [
      "oxidised-jhumka-earrings",
      "statement-chandbali-earrings",
      "kundan-choker-necklace",
      "slim-stackable-bangles-set-of-4",
      "pearl-drop-earrings-gold-tone",
      "kundan-necklace-earring-set",
    ],
    relatedCategoryPaths: [
      "women/earrings",
      "women/necklaces",
      "women/bangles",
      "women/jewellery-sets",
    ],
    relatedOccasionSlugs: ["wedding-jewellery", "gifting"],
    faq: [
      {
        question: "What jewellery is best for Diwali?",
        answer:
          "Statement earrings — jhumkas, chandbalis or pearl drops — are the starting point. Add a simple choker or a bangle stack. Gold-tone pieces catch the festive light well; oxidised pieces work with cotton and casual festive outfits.",
      },
      {
        question: "What jewellery works with a lehenga for Navratri?",
        answer:
          "A colourful stone earring that picks up one of the lehenga's colours, minimal bangles on one wrist, and no necklace if the blouse has embroidery at the neckline. Simple formula, always correct.",
      },
    ],
    image: ph(2, "Placeholder: festive jewellery — gold-tone statement pieces on deep colour background"),
  },
  {
    slug: "gifting",
    name: "Jewellery Gifting",
    heading: "Jewellery Gifts for Every Occasion",
    seoTitle: "Jewellery Gifts Online India | Kesa Lifestyle",
    seoDescription:
      "Shop jewellery gifts for birthdays, anniversaries, weddings and festivals. Beautifully packaged earrings, necklaces, bracelets and sets under ₹2,999.",
    intro:
      "Jewellery is a gift that lasts longer than most. These are the pieces that are easy to give and easy to love.",
    body: [
      {
        heading: "What makes a good jewellery gift",
        content: [
          "Versatility comes first. A gift that works with everyday clothes and special outfits is worn more than a piece that only suits one context. Pearl studs, a delicate chain, a simple bracelet — these are pieces the person will reach for every week.",
          "If you are buying for someone whose style you are not sure of: buy minimal, in the metal tone they already wear. A simple piece in the right metal tone is better received than a statement piece that may not match their wardrobe.",
        ],
      },
      {
        heading: "The best gift categories",
        content: [
          "Earrings are the most popular jewellery gift because they are not size-dependent. Studs and small hoops are always safe choices. Pearl drops are universally flattering.",
          "A necklace-and-earring set removes the co-ordination question. The recipient gets two pieces that are designed to be worn together, which is often the styling challenge for people who are not regular jewellery wearers.",
          "A charm bracelet or a simple bangle is a good birthday gift — personal but not overly intimate, appropriate for colleagues, friends and family alike.",
        ],
      },
      {
        heading: "Packaging and presentation",
        content: [
          "Kesa pieces are boxed with a care card and wrapped for gifting. If you are including a handwritten note, write the note separately rather than inside the box — that way the box is intact when they open it and the note is a separate moment.",
        ],
      },
    ],
    featuredProductSlugs: [
      "pearl-stud-earrings",
      "pearl-drop-earrings-gold-tone",
      "pearl-necklace-earring-set",
      "pearl-charm-bracelet",
      "fine-pendant-chain-gold-tone",
      "minimal-chain-set-silver-tone",
      "signet-ring-rose-gold-tone",
    ],
    relatedCategoryPaths: [
      "women/earrings",
      "women/jewellery-sets",
      "women/bracelets",
      "women/necklaces",
    ],
    relatedOccasionSlugs: ["wedding-jewellery", "festive-jewellery"],
    faq: [
      {
        question: "What jewellery is a safe gift for someone I don't know well?",
        answer:
          "Pearl studs or a simple gold-tone chain bracelet. Both are universally flattering, do not require size knowledge, and suit a wide range of styles. Avoid bold statement pieces for people whose taste you are unsure of.",
      },
      {
        question: "Do you ship gifts directly to the recipient?",
        answer:
          "Yes. At checkout, enter the recipient's delivery address. Add a gift note in the order notes field.",
      },
      {
        question: "Is the jewellery packaged for gifting?",
        answer:
          "All Kesa pieces ship in our branded box with a care card. No invoice is included in the box by default.",
      },
    ],
    image: ph(1, "Placeholder: jewellery gift — boxed pearl earrings and bracelet on a white surface"),
  },
];

export function getOccasionPageBySlug(slug: string): OccasionPage | null {
  return seedOccasionPages.find((p) => p.slug === slug) ?? null;
}
