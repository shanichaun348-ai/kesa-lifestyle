/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — JOURNAL ARTICLES
 *
 * Full-body article content for SEO landing pages. Every piece must have
 * real useful content — no thin pages. Mirrors the `journal_posts` table
 * (docs/05 §8). Images resolve to SVG placeholders until real photos exist.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { ImageRef } from "@/modules/catalog/types";

export type ContentSection = {
  heading?: string;
  paragraphs: string[];
};

export type JournalArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingMinutes: number;
  publishedAt: string;
  image: ImageRef;
  body: ContentSection[];
  /** Product slugs to feature in a "Shop this" rail at the bottom. */
  relatedProductSlugs: string[];
  /** Category paths to link from the article footer. */
  relatedCategoryPaths: string[];
};

const ph = (n: 1 | 2 | 3 | 4, alt: string): ImageRef => ({
  src: `/placeholders/editorial-${n > 2 ? (n % 2) + 1 : n}.svg`,
  alt,
  unoptimized: true,
});

export const seedJournalArticles: JournalArticle[] = [
  {
    slug: "demo-how-to-care-for-gold-plated-jewellery",
    title: "How to care for gold-plated jewellery",
    excerpt:
      "Five habits that keep plated pieces bright for years, and the two things that ruin them fastest.",
    category: "Care",
    readingMinutes: 4,
    publishedAt: "2026-08-12",
    image: ph(1, "Placeholder: jewellery care article — pieces laid flat on a cloth"),
    body: [
      {
        paragraphs: [
          "Gold-plated jewellery can last years with simple care, or look dull within weeks without it. The base metal matters — brass holds plating longer than alloy — but daily habits matter more.",
        ],
      },
      {
        heading: "The five habits that work",
        paragraphs: [
          "Put jewellery on last, after perfume, hairspray and skin creams. Chemicals in fragrance and lotion are the fastest way to strip a plated finish.",
          "Take pieces off before washing your hands, showering or swimming. Water alone is harmless; water combined with soap or chlorine accelerates tarnish by stripping the protective layer.",
          "Store each piece in its own pouch or a soft-lined box. Metal-on-metal contact causes micro-scratches that dull the surface over time.",
          "Wipe pieces clean with a soft dry cloth after wearing — particularly earrings and rings. Skin oil and sweat are mildly acidic and will cloud the finish if left on.",
          "Keep jewellery out of direct sunlight when stored. UV exposure does not damage metal directly but can fade any coloured stones or enamel details.",
        ],
      },
      {
        heading: "The two things that ruin plating fastest",
        paragraphs: [
          "Abrasive cleaning. Never use a toothbrush, polishing cloth or any cream cleaner on plated pieces. These physically remove the plating layer along with whatever was dulling it. A damp soft cloth is all you need.",
          "Storage in the bathroom. Humidity accelerates tarnish even when pieces are not worn. Move jewellery to a bedroom drawer or a dry storage case.",
        ],
      },
      {
        heading: "When tarnish appears anyway",
        paragraphs: [
          "A small amount of tarnish, especially at edges and settings, is normal after months of regular wear. A very gentle wipe with a lightly damp microfibre cloth removes surface tarnish without risk. For pieces with stones, avoid soaking — instead use a dry cotton bud around the settings.",
          "If the plating has worn through to bare metal (usually seen as a copper or dark stripe at points of friction), the piece is near the end of its first life. Many jewellers will re-plate for a small fee, or the piece can be retired to a collection display.",
        ],
      },
      {
        heading: "A note on our pieces",
        paragraphs: [
          "All Kesa pieces use a base metal that is nickel-safe and hypoallergenic. The plating is applied in multiple passes to build up thickness. With normal care, the finish should last at least a year of daily wear — longer for pieces worn occasionally.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-drop-earrings-gold-tone",
      "minimal-huggie-hoops-gold-tone",
      "fine-pendant-chain-gold-tone",
      "layered-coin-necklace",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces"],
  },
  {
    slug: "demo-layering-chains-for-men",
    title: "Layering chains: a guide for men",
    excerpt: "Lengths, widths and how many is too many.",
    category: "Styling",
    readingMinutes: 3,
    publishedAt: "2026-09-03",
    image: ph(2, "Placeholder: two layered chains on a plain background"),
    body: [
      {
        paragraphs: [
          "Layering chains for men is about proportion, not quantity. Two chains worn well look more intentional than five chains worn carelessly.",
        ],
      },
      {
        heading: "Start with length",
        paragraphs: [
          "A 18-inch chain sits at the collarbone, inside an open collar. A 20–22 inch chain falls to the sternum. A 24-inch chain drops to the mid-chest. Layer two chains that are at least 4 cm apart in length so they sit at different levels and do not tangle.",
          "The most wearable combination: one shorter chain (18–20 inch) with one longer (22–24 inch). Both visible over a crew neck or a casual shirt with an open collar.",
        ],
      },
      {
        heading: "Width and style",
        paragraphs: [
          "A 2–2.5 mm box or curb chain disappears under clothing and layers easily. A 4–6 mm chain makes a statement on its own. Avoid wearing two heavy chains together — the visual weight becomes cluttered.",
          "Mix textures if you want more interest: a slim flat box chain with a slightly wider rope chain. Keep the metal tone consistent — mixing silver and gold usually reads accidental rather than intentional.",
        ],
      },
      {
        heading: "Pendants",
        paragraphs: [
          "A pendant on one chain, bare chain on the other. Never two pendants — the layered look is already doing visual work, and a pendant on each chain becomes too busy.",
          "Keep the pendant simple: a bar, a disc, a small geometric shape. Pendant size should be proportional to the chain — a heavy pendant on a 2 mm chain will pull the chain down and stretch the links over time.",
        ],
      },
      {
        heading: "The one-chain option",
        paragraphs: [
          "If in doubt: one chain, no pendant, correct length. A single well-chosen chain worn over a plain t-shirt or open collar shirt is always clean and correct. Layering is additive; start minimal and build from there.",
        ],
      },
    ],
    relatedProductSlugs: [
      "fine-box-chain-stainless-steel",
      "rope-chain-stainless-steel",
      "cuban-link-chain-gold-tone",
      "steel-bar-pendant",
    ],
    relatedCategoryPaths: ["men/chains", "men/pendants"],
  },
  {
    slug: "demo-festive-edit-under-999",
    title: "The festive edit under ₹999",
    excerpt: "Statement pieces that do the work without the price tag.",
    category: "Edits",
    readingMinutes: 3,
    publishedAt: "2026-09-20",
    image: ph(2, "Placeholder: festive jewellery flatlay with vibrant colours"),
    body: [
      {
        paragraphs: [
          "Festive dressing deserves statement jewellery — but buying pieces you will wear twice a year does not have to mean spending the most. These are the pieces under ₹999 that earn their place in a festive rotation.",
        ],
      },
      {
        heading: "Statement earrings",
        paragraphs: [
          "Chandbalis and jhumkas do the heavy lifting for festive looks. A pair of oxidised jhumkas at ₹699 work with cotton kurtas, silk blouses and salwar sets. For a more contemporary take on festive, pearl drops at ₹599 pair as well with a gown as with ethnic wear.",
          "Go bold with the earring and keep everything else minimal — one wrist piece, no necklace, or a thin chain that sits inside the neckline.",
        ],
      },
      {
        heading: "Bangles that stack",
        paragraphs: [
          "Slim stackable bangles are festive essentials. A set of four gold-tone bangles at ₹299 per set can be doubled up on one wrist or split across both. The sound of bangles is part of the occasion.",
          "Pair plain bangles with a single textured kada for contrast. If you are wearing jhumkas, keep the wrist piece simple so neither competes.",
        ],
      },
      {
        heading: "For men: one piece is enough",
        paragraphs: [
          "Festive season is the best occasion to wear the piece you keep for occasions. A gold-tone Cuban link or a curb chain at the collarbone level, visible over a kurta, reads festive without effort.",
          "If you already wear a chain daily, add a pendant for the occasion rather than a second chain. Keep everything else clean — no rings or bracelets if the chain is already making a statement.",
        ],
      },
    ],
    relatedProductSlugs: [
      "oxidised-jhumka-earrings",
      "statement-chandbali-earrings",
      "slim-stackable-bangles-set-of-4",
      "pearl-drop-earrings-gold-tone",
      "cuban-link-chain-gold-tone",
      "om-pendant-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/bangles", "men/chains"],
  },
  {
    slug: "demo-building-a-jewellery-capsule-wardrobe",
    title: "Building a jewellery capsule wardrobe",
    excerpt:
      "Eight pieces that cover every occasion from office to wedding, and how to choose them.",
    category: "Styling",
    readingMinutes: 5,
    publishedAt: "2026-07-28",
    image: ph(1, "Placeholder: eight pieces arranged in a flat lay — capsule collection"),
    body: [
      {
        paragraphs: [
          "A capsule jewellery wardrobe is not about owning the minimum number of pieces. It is about owning pieces that each cover multiple occasions without looking like they are trying too hard at any of them.",
        ],
      },
      {
        heading: "The eight pieces",
        paragraphs: [
          "A pair of small studs. Pearl or plain metal. These are the pieces you put on half-asleep and that work with everything from a gym kit to an office outfit.",
          "A pair of medium hoops or huggie hoops. Slightly more present than studs, still appropriate for professional settings. Gold or silver tone, nothing with stones or dangles.",
          "One statement earring for evenings and occasions. Drops, chandbalis or jhumkas. The one piece that does the work when you want to look dressed without changing your outfit.",
          "A delicate necklace, 16–18 inches. A pendant chain, a fine curb or a simple bar. Sits inside a neckline without drawing attention — until nothing else is around it, and then it is the whole look.",
          "One layering chain, a different length than the delicate necklace. The pair of them, worn together or separately, covers more outfits than either alone.",
          "A simple ring or a stackable set. Worn on one hand every day. Not a statement ring — those are optional additions on top of this foundation.",
          "One bracelet. A chain, a cuff, or a bangle. The one piece on your wrist that anchors the rest of the stack if you are building one, or stands alone when you are not.",
          "A statement piece for weddings and festivals. A choker, a set, or a pair of chandbalis. This is the piece you wear six times a year and every time feels like the right choice.",
        ],
      },
      {
        heading: "How to choose",
        paragraphs: [
          "Pick one metal tone for the daily pieces — gold tone or silver tone — and stick to it. Statement and festive pieces can step outside this rule, but the daily pieces should all belong to the same visual language.",
          "Buy statement pieces last. They are the most personal and the easiest to get wrong. Start with the studs, the delicate necklace and the bracelet. Live with those for a season. Then fill in the gaps.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-stud-earrings",
      "minimal-huggie-hoops-gold-tone",
      "fine-pendant-chain-gold-tone",
      "stackable-band-ring-set",
      "fine-curb-chain-bracelet",
      "pearl-drop-earrings-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "women/bracelets"],
  },
  {
    slug: "demo-wedding-jewellery-checklist",
    title: "The complete wedding jewellery checklist",
    excerpt:
      "What to buy, what to borrow, and how to plan jewellery across every ceremony.",
    category: "Occasions",
    readingMinutes: 6,
    publishedAt: "2026-08-30",
    image: ph(2, "Placeholder: bridal jewellery flatlay for a wedding ceremony"),
    body: [
      {
        paragraphs: [
          "Wedding jewellery planning is different from regular jewellery shopping. You are buying for specific outfits, specific ceremonies and specific photographs — often in a compressed time window.",
        ],
      },
      {
        heading: "Start with the outfits",
        paragraphs: [
          "Bridal and wedding jewellery makes sense only in relation to the outfit's neckline, colour and weight. A heavy silk lehenga with embroidery needs less jewellery than a plain georgette saree. Map your jewellery to the outfit, not the other way around.",
          "For each outfit, note: the neckline, the sleeve length, the colour palette and whether the outfit already has embellishment at the neckline or ears. These four facts tell you what space jewellery has to occupy.",
        ],
      },
      {
        heading: "For the main ceremony",
        paragraphs: [
          "Statement earrings are usually the anchor piece. Chandbalis, jhumkas or long drops — choose for the neckline and hair. If hair is up, go longer and bolder. If hair is down, go shorter and slightly wider.",
          "A necklace is optional if the outfit has a heavy neckline or zardozi work. When you do wear one, a choker or collar sits more comfortably under a dupatta than a long pendant chain.",
          "A full bangles-and-bracelet stack on one wrist is traditional. If the bridal look calls for it: bangles plus a single broad bracelet or a cuff on the other wrist. Keep rings minimal so nothing competes with the bangles.",
        ],
      },
      {
        heading: "For mehndi and haldi ceremonies",
        paragraphs: [
          "These are casual ceremonies even when they are big events. Minimal jewellery that you do not mind getting turmeric on, or jewellery you have specifically bought to be stained. Stackable bangles and simple studs are standard.",
        ],
      },
      {
        heading: "For guests",
        paragraphs: [
          "As a wedding guest, the rule is: look dressed without competing with the bride. Pearl drops, a simple choker and one statement piece is enough. Save the kundan set and the full bangles stack for your own special occasions.",
        ],
      },
      {
        heading: "Planning the budget",
        paragraphs: [
          "Allocate the most to the pieces visible in ceremony photographs: earrings and the primary necklace for a bridal look, one statement piece for guests. Everything else can be less expensive — bangles, rings and anklets are rarely photographed individually.",
        ],
      },
    ],
    relatedProductSlugs: [
      "kundan-necklace-earring-set",
      "statement-chandbali-earrings",
      "kundan-choker-necklace",
      "pearl-necklace-earring-set",
      "slim-stackable-bangles-set-of-4",
      "pearl-drop-earrings-gold-tone",
    ],
    relatedCategoryPaths: [
      "women/jewellery-sets",
      "women/earrings",
      "women/necklaces",
      "women/bangles",
    ],
  },
];

export function getJournalArticleBySlug(slug: string): JournalArticle | null {
  return seedJournalArticles.find((a) => a.slug === slug) ?? null;
}
