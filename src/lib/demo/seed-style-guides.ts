/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — STYLE GUIDES
 *
 * How-to guides with practical styling advice. Each guide must have real
 * actionable content — no thin pages. Slugs match the hrefs in homepage.ts
 * so the styling-guides section links to real pages.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { ImageRef } from "@/modules/catalog/types";

export type GuideSection = {
  heading: string;
  content: string[];
};

export type StyleGuide = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  image: ImageRef;
  body: GuideSection[];
  featuredProductSlugs: string[];
  relatedCategoryPaths: string[];
};

const ph = (n: 1 | 2 | 3 | 4, alt: string): ImageRef => ({
  src: `/placeholders/editorial-${n > 2 ? (n % 2) + 1 : n}.svg`,
  alt,
  unoptimized: true,
});

export const seedStyleGuides: StyleGuide[] = [
  {
    slug: "jewellery-for-saree",
    title: "What jewellery to wear with a saree",
    excerpt: "Neckline first, then earrings. A styling guide for every drape.",
    publishedAt: "2026-07-14",
    image: ph(1, "Placeholder: style guide cover — saree jewellery styling"),
    body: [
      {
        heading: "Start with the neckline, not the earrings",
        content: [
          "The saree neckline is the blouse neckline, and the blouse neckline determines your jewellery. A boat neck leaves no room for a long necklace; a deep V gives you the most flexibility. Map your blouse before you open your jewellery box.",
          "A heavily embroidered blouse with a high or sweetheart neck: skip the necklace entirely, or wear a very slim chain that sits high inside the embroidery. The earrings become the only jewellery, and they should be substantial.",
          "A plain blouse with a round or square neck: room for a statement necklace. A choker or short pendant chain works better than a long chain, which can get caught in the pallu.",
        ],
      },
      {
        heading: "Earrings: the case for going bigger",
        content: [
          "Saree dressing is one of the few contexts where larger earrings are almost always correct. The drape adds visual weight; the earrings need to match it. Chandbalis, jhumkas, long drops and statement hoops all belong here.",
          "If hair is up — which it often is for weddings and pujas — go longer. Drops that brush the shoulder are visible and intentional. If hair is down, medium-length drops sit better than very long ones.",
        ],
      },
      {
        heading: "The bangles question",
        content: [
          "Bangles are traditional with a saree, but not required. For casual cotton sarees: stacked slim bangles or a single kada, nothing too heavy. For silk sarees and formal occasions: a fuller stack, or a set of bangles plus a cuff on the other wrist.",
          "The number of bangles traditionally differs by region and occasion. If you are dressing for a specific ritual context, follow that context's customs. For general dressing, let the weight of the saree guide you — heavier fabric calls for more presence on the wrist.",
        ],
      },
      {
        heading: "What not to do",
        content: [
          "Do not match metal tone to saree colour. Gold-tone jewellery works with warm and cool sarees alike; silver-tone is equally versatile. The metal is the constant, the saree is the variable.",
          "Do not stack rings with a full bangle stack. Rings get lost under bangles; wear one statement ring on the other hand instead.",
        ],
      },
    ],
    featuredProductSlugs: [
      "statement-chandbali-earrings",
      "oxidised-jhumka-earrings",
      "kundan-choker-necklace",
      "slim-stackable-bangles-set-of-4",
      "oxidised-kada-bangle",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "women/bangles"],
  },
  {
    slug: "earrings-for-your-face-shape",
    title: "Earrings for your face shape",
    excerpt: "Drops, hoops or studs: how to choose what flatters.",
    publishedAt: "2026-08-05",
    image: ph(2, "Placeholder: style guide cover — different earring shapes"),
    body: [
      {
        heading: "Why face shape is a useful starting point",
        content: [
          "Face shape is not a rule — it is a starting point. The goal is balance: earrings that counterbalance the widest or longest part of your face. Once you understand the principle, you can break it intentionally.",
        ],
      },
      {
        heading: "Round face",
        content: [
          "Round faces are widest at the cheeks. Drops and linear earrings create vertical length and slim the appearance of the face. Long drops, angled dangles and narrow rectangles all work well.",
          "Avoid: large circular hoops and round studs, which echo the roundness of the face and make it look wider. Small hoops are fine; it is the large, wide styles to avoid.",
        ],
      },
      {
        heading: "Oval face",
        content: [
          "Oval faces are the most versatile — almost anything works. Take this as permission to experiment with statement pieces, architectural shapes and anything else you like. If you want a rule: avoid extremely elongated drops that make the face look longer.",
        ],
      },
      {
        heading: "Square or angular face",
        content: [
          "Square faces are widest at the jaw with a strong jawline. Curved shapes and dangling styles soften the angles. Hoops, drops with curved elements and anything with movement all work well.",
          "Avoid: sharp geometric shapes that repeat the angles of the jaw. Square and angular geometric earrings can look harsh against an angular face.",
        ],
      },
      {
        heading: "Heart-shaped face",
        content: [
          "Heart-shaped faces are widest at the forehead and narrow at the jaw. Styles that are wider at the bottom than the top — chandelier earrings, teardrop drops, triangles pointing down — visually balance the narrow jaw.",
          "Avoid: styles that are wide at the top (like some cluster studs), which add width where the face is already wide.",
        ],
      },
      {
        heading: "Long or oblong face",
        content: [
          "Long faces benefit from width rather than length. Wide hoops and studs with visual width add breadth and counterbalance the length. Clustered studs and wide geometric shapes all work.",
          "Avoid: very long drops and narrow linear styles, which elongate the face further.",
        ],
      },
    ],
    featuredProductSlugs: [
      "pearl-drop-earrings-gold-tone",
      "minimal-huggie-hoops-gold-tone",
      "thin-threader-earrings-silver-tone",
      "pearl-stud-earrings",
      "statement-chandbali-earrings",
    ],
    relatedCategoryPaths: ["women/earrings"],
  },
  {
    slug: "jewellery-for-office-wear",
    title: "Jewellery for office wear",
    excerpt: "Minimal pieces that read polished on video calls and in person.",
    publishedAt: "2026-09-10",
    image: ph(1, "Placeholder: style guide cover — office jewellery on a plain surface"),
    body: [
      {
        heading: "The principle: presence without distraction",
        content: [
          "Office jewellery should be present enough to look deliberate but quiet enough that it does not distract in meetings or on video calls. The goal is polish, not statement.",
        ],
      },
      {
        heading: "Earrings",
        content: [
          "Small to medium studs and minimal hoops are the standard. Pearl studs, plain metal studs, huggie hoops — all of these read professional in any industry context. They photograph well on video calls without catching the light in a distracting way.",
          "Drops are acceptable in most offices if they are slim and minimal — a simple bar drop or a very thin linear drop. Avoid anything with movement or sound for meetings; the distraction is real.",
        ],
      },
      {
        heading: "Necklaces",
        content: [
          "A delicate chain at the collarbone level, or a simple pendant that sits inside a neckline, reads perfectly professional. Keep the length consistent with the neckline — a necklace that sits inside a high neck is less visible than one over an open collar, and both are fine.",
          "Statement necklaces and chokers read more fashion-forward and may not suit conservative industries. Creative industries and startups are more permissive; financial and legal sectors are less so.",
        ],
      },
      {
        heading: "Rings and bracelets",
        content: [
          "A simple ring or a stackable set on one hand reads minimal and polished. A thin chain bracelet or a slim bangle is fine for most environments. Avoid anything that makes sound when you type.",
          "On video calls, your hands are visible whenever you gesticulate. One ring and one bracelet is a complete look; more than that starts to read as too much.",
        ],
      },
      {
        heading: "Metal tone",
        content: [
          "Pick one tone for the day and stick to it. Gold-tone or silver-tone — mixing reads less intentional in a professional context than in a fashion context. Your watch, your rings and your necklace should all belong to the same tone.",
        ],
      },
    ],
    featuredProductSlugs: [
      "pearl-stud-earrings",
      "minimal-huggie-hoops-gold-tone",
      "thin-threader-earrings-silver-tone",
      "fine-pendant-chain-gold-tone",
      "stackable-band-ring-set",
      "fine-curb-chain-bracelet",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "women/rings"],
  },
];

export function getStyleGuideBySlug(slug: string): StyleGuide | null {
  return seedStyleGuides.find((g) => g.slug === slug) ?? null;
}
