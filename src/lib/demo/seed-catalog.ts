/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO SEED — CATALOGUE
 *
 * Deterministic sample catalogue used by the in-memory repository so the
 * listing, filtering and product pages can be built and tested before the
 * database exists. Every product, price and stock figure here is invented.
 * No ratings or reviews are seeded: those only ever come from real
 * customers. Images resolve to neutral SVG placeholders through `/media/`.
 *
 * Shapes follow docs/05_DATABASE_DESIGN.md; the Phase 1 seed script will
 * load an equivalent set into Postgres for local development.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type {
  AttributeDefinition,
  AttributeKey,
  Category,
  Collection,
  ImageRef,
  Product,
  ProductVariant,
} from "@/modules/catalog/types";

/** Fixed "now" so new-arrival logic is stable in tests and builds. */
export const SEED_NOW = new Date("2026-10-05T00:00:00.000Z");

const daysAgo = (n: number) => new Date(SEED_NOW.getTime() - n * 86_400_000).toISOString();

const placeholder = (n: 1 | 2 | 3 | 4, alt: string): ImageRef => ({ src: `/placeholders/product-${n}.svg`, alt, unoptimized: true });

/** Stable, meaningful product media URL (ADR-30, docs/06 §1.8). */
export const productImageUrl = (slug: string, index: number) => `/media/products/${slug}/${slug}-${index + 1}.svg`;

/* ------------------------------------------------------------ attributes */

export const seedAttributes: AttributeDefinition[] = [
  {
    key: "material",
    name: "Material",
    kind: "single",
    values: [
      { slug: "brass", label: "Brass" },
      { slug: "stainless-steel", label: "Stainless steel" },
      { slug: "alloy", label: "Alloy" },
      { slug: "copper", label: "Copper" },
    ],
  },
  {
    key: "finish",
    name: "Finish",
    kind: "single",
    values: [
      { slug: "gold-tone", label: "Gold tone", swatchHex: "#C9A66B" },
      { slug: "rose-gold-tone", label: "Rose gold tone", swatchHex: "#D4A69A" },
      { slug: "silver-tone", label: "Silver tone", swatchHex: "#C8C8C8" },
      { slug: "oxidised", label: "Oxidised", swatchHex: "#6B6660" },
      { slug: "rhodium-plated", label: "Rhodium plated", swatchHex: "#D9DCDF" },
    ],
  },
  {
    key: "color",
    name: "Colour",
    kind: "multi",
    values: [
      { slug: "gold", label: "Gold", swatchHex: "#C9A66B" },
      { slug: "silver", label: "Silver", swatchHex: "#C8C8C8" },
      { slug: "white", label: "White", swatchHex: "#F3F1EC" },
      { slug: "green", label: "Green", swatchHex: "#5F7F6A" },
      { slug: "red", label: "Red", swatchHex: "#9B3B3B" },
      { slug: "black", label: "Black", swatchHex: "#2B2926" },
      { slug: "multicolour", label: "Multicolour", swatchHex: "#B59BC4" },
    ],
  },
  {
    key: "occasion",
    name: "Occasion",
    kind: "multi",
    values: [
      { slug: "daily-wear", label: "Daily wear" },
      { slug: "office-wear", label: "Office wear" },
      { slug: "party-wear", label: "Party wear" },
      { slug: "wedding", label: "Wedding" },
      { slug: "gifting", label: "Gifting" },
    ],
  },
  {
    key: "style",
    name: "Style",
    kind: "multi",
    values: [
      { slug: "minimal", label: "Minimal" },
      { slug: "statement", label: "Statement" },
      { slug: "traditional", label: "Traditional" },
      { slug: "contemporary", label: "Contemporary" },
      { slug: "pearl", label: "Pearl" },
      { slug: "kundan", label: "Kundan" },
    ],
  },
];

/* ------------------------------------------------------------ categories */

type CategorySpec = {
  gender: "women" | "men";
  slug: string;
  name: string;
  titleNoun: string;
  intro: string;
  body: string[];
  faq: Array<{ question: string; answer: string }>;
  image: ImageRef;
  dimensions: string;
  stylingTips: string[];
};

const categorySpecs: CategorySpec[] = [
  {
    gender: "women",
    slug: "necklaces",
    name: "Necklaces",
    titleNoun: "Necklaces for Women",
    intro: "Layering chains, pendants, chokers and statement pieces in gold tone, silver tone and oxidised finishes. Lightweight and skin-friendly.",
    body: [
      "A necklace sets the tone for the whole outfit. Short chokers and pendants suit round and boat necklines; longer layered chains fill a deep V or an open shirt.",
      "Everything here is plated over a hypoallergenic base and finished with secure lobster clasps. Most pieces weigh under 20 g, so they stay comfortable through a full day.",
    ],
    faq: [
      { question: "Which necklace length should I choose?", answer: "16 inch sits at the collarbone, 18 inch just below it, and 20–24 inch works for layering or over a kurta." },
      { question: "Will the plating fade?", answer: "With basic care (no perfume, no water, store in the pouch) gold-tone plating keeps its colour for years of regular wear." },
    ],
    image: placeholder(2, ""),
    dimensions: "Chain 45 cm with 5 cm extender; pendant 1.5 cm",
    stylingTips: ["Wear short with a boat neck or high collar; go long with a V-neck or an open shirt.", "Layer two lengths at least 5 cm apart so they never tangle.", "Keep earrings small when the necklace is the hero."],
  },
  {
    gender: "women",
    slug: "earrings",
    name: "Earrings",
    titleNoun: "Earrings for Women",
    intro: "Studs, hoops, drops and jhumkas for every day and every occasion. Nickel-safe posts, lightweight builds.",
    body: [
      "The right earring depends on your face shape and your hair. Drops lengthen a round face; studs and small hoops balance a longer one. If you wear your hair up, go bolder.",
      "All our earrings use nickel-safe posts and hooks. Push-backs and screw-backs are noted on each product.",
    ],
    faq: [
      { question: "Are these safe for sensitive ears?", answer: "Posts and hooks are nickel-safe. If you react to most fashion jewellery, choose pieces marked hypoallergenic." },
      { question: "Can I return earrings?", answer: "For hygiene reasons earrings are exchange-only; damaged or incorrect pieces are replaced free of charge." },
    ],
    image: placeholder(1, ""),
    dimensions: "Drop 3.2 cm; width 1.1 cm",
    stylingTips: ["Drops lengthen a round face; studs and small hoops balance a longer one.", "With hair up, go one size bolder than you think.", "Match the metal tone to your watch or rings, not to your outfit."],
  },
  {
    gender: "women",
    slug: "rings",
    name: "Rings",
    titleNoun: "Rings for Women",
    intro: "Stackable bands, signets and statement rings in sizes 10 to 18.",
    body: ["Measure before you buy: wrap a strip of paper around the base of your finger and compare against our size guide. Stackable bands are best bought in the same size."],
    faq: [{ question: "How do I find my ring size?", answer: "Use the size guide on each ring page. If you are between sizes, go up." }],
    image: placeholder(3, ""),
    dimensions: "Band width 2 mm; face 8 mm",
    stylingTips: ["Stack two slim bands with one textured ring; leave the index finger bare.", "Keep stacks on one hand and a single ring on the other.", "A signet on the little finger reads modern with minimal everything else."],
  },
  {
    gender: "women",
    slug: "bracelets",
    name: "Bracelets",
    titleNoun: "Bracelets for Women",
    intro: "Fine chains, cuffs and charm bracelets that stack well together.",
    body: ["Bracelets are the easiest pieces to layer. Mix one chain with one cuff; keep the finish the same across the stack."],
    faq: [],
    image: placeholder(4, ""),
    dimensions: "Length 18 cm with 3 cm extender",
    stylingTips: ["One chain plus one cuff is a complete stack.", "Wear on the hand without a watch.", "Push sleeves up a little so the bracelet shows."],
  },
  {
    gender: "women",
    slug: "bangles",
    name: "Bangles",
    titleNoun: "Bangles for Women",
    intro: "Slim bangles, kadas and stackable sets in standard sizes 2.4 to 2.8.",
    body: ["Bangle size is the inside diameter in inches. Most adults wear 2.4 or 2.6. Each product lists the sizes available."],
    faq: [{ question: "What bangle size am I?", answer: "Close your hand as if slipping a bangle on and measure the widest part across the knuckles. Match to the nearest size up." }],
    image: placeholder(2, ""),
    dimensions: "Width 4 mm; inner diameter per size",
    stylingTips: ["Odd numbers stack better: three or five slim bangles.", "Mix one textured kada with plain bangles for contrast.", "Wear on the arm you gesture with."],
  },
  {
    gender: "women",
    slug: "jewellery-sets",
    name: "Jewellery sets",
    titleNoun: "Jewellery Sets for Women",
    intro: "Matching necklace and earring sets for weddings, festivals and gifting.",
    body: ["A set takes the guesswork out of an occasion outfit. Kundan and pearl sets suit traditional wear; minimal sets work with sarees and gowns alike."],
    faq: [],
    image: placeholder(4, ""),
    dimensions: "Necklace 40 cm; earrings 4 cm drop",
    stylingTips: ["Let the set carry the look: skip a bracelet and keep nails neutral.", "With a heavy neckline, wear only the earrings from the set.", "Pin hair back so the earrings show."],
  },
  {
    gender: "men",
    slug: "chains",
    name: "Chains",
    titleNoun: "Chains for Men",
    intro: "Box, curb, rope and Cuban chains in stainless steel and plated brass. Built for daily wear.",
    body: ["Width matters more than length. 2 mm chains layer well; 4–6 mm chains stand alone. Stainless steel resists tarnish without plating."],
    faq: [{ question: "Will a steel chain rust?", answer: "No. 316L stainless steel is tarnish and rust resistant and safe for daily wear, including in the shower." }],
    image: placeholder(3, ""),
    dimensions: "Width 2 mm; length per size",
    stylingTips: ["A 2 mm chain sits inside the collar; 4 mm and up sits outside.", "Layer two chains with at least 5 cm difference in length.", "Match the chain tone to your watch."],
  },
  {
    gender: "men",
    slug: "bracelets",
    name: "Bracelets",
    titleNoun: "Bracelets for Men",
    intro: "Link bracelets, leather-look wraps and bead strands.",
    body: ["Measure your wrist and add 1–1.5 cm for a comfortable fit."],
    faq: [],
    image: placeholder(3, ""),
    dimensions: "Length 20 cm; width 6 mm",
    stylingTips: ["Wear opposite your watch.", "One metal bracelet with one bead strand is enough.", "Fit should allow one finger underneath."],
  },
  {
    gender: "men",
    slug: "rings",
    name: "Rings",
    titleNoun: "Rings for Men",
    intro: "Signets, bands and minimal rings in sizes 16 to 24.",
    body: ["Wider bands fit tighter; consider going up half a size for anything over 6 mm wide."],
    faq: [],
    image: placeholder(3, ""),
    dimensions: "Band width 6 mm",
    stylingTips: ["A signet on the little finger or ring finger; nothing on the index.", "Keep to one ring per hand.", "Matte finishes hide scratches better for daily wear."],
  },
  {
    gender: "men",
    slug: "pendants",
    name: "Pendants",
    titleNoun: "Pendants for Men",
    intro: "Minimal pendants sold with or without a chain.",
    body: [],
    faq: [],
    image: placeholder(1, ""),
    dimensions: "Pendant 2.2 cm × 1 cm; chain 55 cm",
    stylingTips: ["Sits best just below the collarbone over a crew neck.", "Pair with a plain chain, never a second pendant.", "Tuck it in under a shirt for a quieter look."],
  },
];

const roots: Category[] = [
  {
    id: "cat-women",
    path: "women",
    slug: "women",
    gender: "women",
    parentPath: null,
    name: "Women",
    titleNoun: "Women's Jewellery",
    intro: "Earrings, necklaces, rings, bracelets, bangles and sets designed to be worn every day and dressed up when it counts.",
    body: [
      "Kesa's women's jewellery is built around three ideas: it should be light enough to forget you are wearing it, finished well enough to look expensive, and priced so you can build a collection.",
    ],
    seoTitle: "Women's Jewellery Online | Kesa Lifestyle",
    seoDescription: "Shop premium fashion jewellery for women: earrings, necklaces, rings, bracelets, bangles and sets. Anti-tarnish plating, skin-friendly, free shipping over ₹999.",
    position: 1,
    isVisible: true,
  },
  {
    id: "cat-men",
    path: "men",
    slug: "men",
    gender: "men",
    parentPath: null,
    name: "Men",
    titleNoun: "Men's Jewellery",
    intro: "Chains, bracelets, rings and pendants in steel and plated brass. Minimal by default.",
    body: ["Men's pieces are designed to be worn daily and layered sparingly. Stainless steel is tarnish-resistant; plated brass is lighter and warmer in tone."],
    seoTitle: "Men's Jewellery Online | Kesa Lifestyle",
    seoDescription: "Shop men's chains, bracelets, rings and pendants. Stainless steel and plated brass, built for daily wear.",
    position: 2,
    // Women-only at launch; flip to true (and restore the nav entries) when the men's range goes live.
    isVisible: false,
  },
];

export const seedCategories: Category[] = [
  ...roots,
  ...categorySpecs.map<Category>((c, i) => ({
    id: `cat-${c.gender}-${c.slug}`,
    path: `${c.gender}/${c.slug}`,
    slug: c.slug,
    gender: c.gender,
    parentPath: c.gender,
    name: c.name,
    titleNoun: c.titleNoun,
    intro: c.intro,
    body: c.body,
    faq: c.faq,
    image: c.image,
    position: i + 1,
    isVisible: c.gender === "women",
  })),
];

/* ------------------------------------------------------------- products */

type Row = {
  slug: string;
  name: string;
  cat: string;
  material: string;
  finish: string;
  colors: string[];
  occasions: string[];
  styles: string[];
  price: number; // rupees
  compareAt?: number;
  /** "single" | ["Size", ["10","12",...]] | ["Length", [...]] */
  variants: "single" | ["Size" | "Length", string[]];
  daysAgo: number;
  sales: number;
  family?: [string, string];
  images: Array<1 | 2 | 3 | 4>;
  /** Real product images; when set, used in place of generated placeholder URLs. */
  imageRefs?: ImageRef[];
  stock?: number;
  weight?: number;
  featured?: number;
  look?: string[];
  status?: "archived";
};

const rows: Row[] = [
  // women/earrings (9)
  { slug: "pearl-drop-earrings-gold-tone", name: "Pearl Drop Earrings in Gold Tone", cat: "women/earrings", material: "brass", finish: "gold-tone", colors: ["gold", "white"], occasions: ["party-wear", "wedding", "gifting"], styles: ["pearl", "contemporary"], price: 1299, compareAt: 1899, variants: "single", daysAgo: 6, sales: 52, family: ["fam-pearl-drop", "Gold tone"], images: [1, 2, 3], weight: 6, featured: 10, look: ["layered-coin-necklace", "pearl-charm-bracelet", "pearl-cocktail-ring"] },
  { slug: "pearl-drop-earrings-silver-tone", name: "Pearl Drop Earrings in Silver Tone", cat: "women/earrings", material: "brass", finish: "silver-tone", colors: ["silver", "white"], occasions: ["party-wear", "wedding"], styles: ["pearl", "contemporary"], price: 1299, compareAt: 1899, variants: "single", daysAgo: 6, sales: 21, family: ["fam-pearl-drop", "Silver tone"], images: [2, 1, 3], weight: 6, look: ["fine-pendant-chain-silver-tone", "open-cuff-bracelet-silver-tone"] },
  { slug: "minimal-huggie-hoops-gold-tone", name: "Minimal Huggie Hoops", cat: "women/earrings", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "office-wear"], styles: ["minimal"], price: 599, variants: "single", daysAgo: 90, sales: 88, images: [1, 3], weight: 3, featured: 8, stock: 2, look: ["fine-pendant-chain-gold-tone", "stackable-band-ring-set"] },
  { slug: "oxidised-jhumka-earrings", name: "Oxidised Jhumka Earrings", cat: "women/earrings", material: "alloy", finish: "oxidised", colors: ["silver"], occasions: ["party-wear", "wedding"], styles: ["traditional", "statement"], price: 699, compareAt: 999, variants: "single", daysAgo: 200, sales: 61, images: [4, 2], stock: 0, weight: 12, look: ["oxidised-kada-bangle", "oxidised-adjustable-ring"] },
  { slug: "emerald-green-stud-earrings", name: "Emerald Green Stone Studs", cat: "women/earrings", material: "brass", finish: "gold-tone", colors: ["green", "gold"], occasions: ["office-wear", "party-wear"], styles: ["contemporary"], price: 499, variants: "single", daysAgo: 12, sales: 30, images: [3, 1], weight: 2, look: ["green-stone-pendant-necklace"] },
  { slug: "statement-chandbali-earrings", name: "Statement Chandbali Earrings", cat: "women/earrings", material: "alloy", finish: "gold-tone", colors: ["gold", "red"], occasions: ["wedding", "party-wear"], styles: ["traditional", "statement", "kundan"], price: 1499, compareAt: 2199, variants: "single", daysAgo: 45, sales: 44, images: [4, 1, 2], weight: 18, look: ["slim-stackable-bangles-set-of-4"] },
  { slug: "thin-threader-earrings-silver-tone", name: "Thin Threader Earrings", cat: "women/earrings", material: "brass", finish: "rhodium-plated", colors: ["silver"], occasions: ["daily-wear", "office-wear"], styles: ["minimal", "contemporary"], price: 549, variants: "single", daysAgo: 20, sales: 12, images: [2, 3], weight: 2 },
  { slug: "pearl-stud-earrings", name: "Classic Pearl Studs", cat: "women/earrings", material: "brass", finish: "gold-tone", colors: ["white", "gold"], occasions: ["daily-wear", "office-wear", "gifting"], styles: ["pearl", "minimal"], price: 449, variants: "single", daysAgo: 300, sales: 73, images: [1, 2], weight: 3 },
  { slug: "black-enamel-hoops", name: "Black Enamel Hoops", cat: "women/earrings", material: "brass", finish: "gold-tone", colors: ["black", "gold"], occasions: ["party-wear", "daily-wear"], styles: ["contemporary"], price: 799, variants: "single", daysAgo: 3, sales: 8, images: [3, 4], weight: 5 },

  // women/necklaces (5 + 1 archived)
  { slug: "layered-coin-necklace", name: "Layered Coin Necklace", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "party-wear"], styles: ["contemporary", "statement"], price: 1499, variants: "single", daysAgo: 15, sales: 31, images: [2, 1, 4], weight: 14, featured: 7, look: ["minimal-huggie-hoops-gold-tone", "stackable-band-ring-set"] },
  { slug: "fine-pendant-chain-gold-tone", name: "Fine Pendant Chain", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "office-wear", "gifting"], styles: ["minimal"], price: 899, variants: ["Length", ["16 inch", "18 inch", "20 inch"]], daysAgo: 120, sales: 47, family: ["fam-fine-pendant", "Gold tone"], images: [2, 3], weight: 5 },
  { slug: "fine-pendant-chain-silver-tone", name: "Fine Pendant Chain in Silver Tone", cat: "women/necklaces", material: "brass", finish: "rhodium-plated", colors: ["silver"], occasions: ["daily-wear", "office-wear"], styles: ["minimal"], price: 899, variants: ["Length", ["16 inch", "18 inch", "20 inch"]], daysAgo: 120, sales: 19, family: ["fam-fine-pendant", "Silver tone"], images: [3, 2], weight: 5 },
  { slug: "kundan-choker-necklace", name: "Kundan Choker Necklace", cat: "women/necklaces", material: "alloy", finish: "gold-tone", colors: ["gold", "white", "red"], occasions: ["wedding", "party-wear"], styles: ["kundan", "traditional", "statement"], price: 2499, compareAt: 3299, variants: "single", daysAgo: 8, sales: 17, images: [4, 2, 1], weight: 38, look: ["statement-chandbali-earrings", "slim-stackable-bangles-set-of-4"] },
  { slug: "green-stone-pendant-necklace", name: "Green Stone Pendant Necklace", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["green", "gold"], occasions: ["office-wear", "gifting"], styles: ["contemporary", "minimal"], price: 1099, variants: "single", daysAgo: 60, sales: 25, images: [2, 4], weight: 8 },
  { slug: "vintage-coin-choker", name: "Vintage Coin Choker", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["party-wear"], styles: ["statement"], price: 1699, variants: "single", daysAgo: 500, sales: 0, images: [2], weight: 20, status: "archived" },

  // women/rings (4)
  { slug: "stackable-band-ring-set", name: "Stackable Band Ring Set of 3", cat: "women/rings", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "office-wear"], styles: ["minimal"], price: 749, variants: ["Size", ["10", "12", "14", "16"]], daysAgo: 70, sales: 41, images: [3, 1], weight: 4 },
  { slug: "pearl-cocktail-ring", name: "Pearl Cocktail Ring", cat: "women/rings", material: "brass", finish: "gold-tone", colors: ["white", "gold"], occasions: ["party-wear", "wedding"], styles: ["pearl", "statement"], price: 899, variants: ["Size", ["12", "14", "16"]], daysAgo: 25, sales: 14, images: [1, 3], weight: 6 },
  { slug: "oxidised-adjustable-ring", name: "Oxidised Adjustable Ring", cat: "women/rings", material: "alloy", finish: "oxidised", colors: ["silver"], occasions: ["daily-wear", "party-wear"], styles: ["traditional"], price: 349, variants: "single", daysAgo: 400, sales: 36, images: [4, 3], weight: 5 },
  { slug: "signet-ring-rose-gold-tone", name: "Slim Signet Ring in Rose Gold Tone", cat: "women/rings", material: "brass", finish: "rose-gold-tone", colors: ["gold"], occasions: ["daily-wear", "gifting"], styles: ["minimal", "contemporary"], price: 699, variants: ["Size", ["10", "12", "14", "16", "18"]], daysAgo: 10, sales: 9, images: [3, 2], weight: 4 },

  // women/bracelets (3)
  { slug: "fine-curb-chain-bracelet", name: "Fine Curb Chain Bracelet", cat: "women/bracelets", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "office-wear"], styles: ["minimal"], price: 649, variants: "single", daysAgo: 150, sales: 48, images: [3, 2], weight: 5 },
  { slug: "pearl-charm-bracelet", name: "Pearl Charm Bracelet", cat: "women/bracelets", material: "brass", finish: "gold-tone", colors: ["white", "gold"], occasions: ["gifting", "party-wear"], styles: ["pearl", "contemporary"], price: 849, variants: "single", daysAgo: 18, sales: 22, images: [1, 2], weight: 7, stock: 3 },
  { slug: "open-cuff-bracelet-silver-tone", name: "Open Cuff Bracelet", cat: "women/bracelets", material: "brass", finish: "rhodium-plated", colors: ["silver"], occasions: ["office-wear", "party-wear"], styles: ["minimal", "statement"], price: 999, variants: "single", daysAgo: 95, sales: 15, images: [2, 3], weight: 11 },

  // women/bangles (3)
  { slug: "slim-stackable-bangles-set-of-4", name: "Slim Stackable Bangles, Set of 4", cat: "women/bangles", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "wedding", "party-wear"], styles: ["minimal", "traditional"], price: 1199, variants: ["Size", ["2.4", "2.6", "2.8"]], daysAgo: 40, sales: 33, images: [2, 4], weight: 22 },
  { slug: "oxidised-kada-bangle", name: "Oxidised Kada", cat: "women/bangles", material: "alloy", finish: "oxidised", colors: ["silver"], occasions: ["party-wear", "daily-wear"], styles: ["traditional", "statement"], price: 799, variants: ["Size", ["2.4", "2.6"]], daysAgo: 220, sales: 27, images: [4, 2], weight: 30 },
  { slug: "pearl-bangle-gold-tone", name: "Pearl Bangle", cat: "women/bangles", material: "brass", finish: "gold-tone", colors: ["white", "gold"], occasions: ["wedding", "gifting"], styles: ["pearl", "contemporary"], price: 1399, variants: ["Size", ["2.4", "2.6", "2.8"]], daysAgo: 5, sales: 6, images: [1, 4], weight: 18 },

  // women/jewellery-sets (3)
  { slug: "kundan-necklace-earring-set", name: "Kundan Necklace and Earring Set", cat: "women/jewellery-sets", material: "alloy", finish: "gold-tone", colors: ["gold", "white"], occasions: ["wedding", "party-wear", "gifting"], styles: ["kundan", "traditional", "statement"], price: 2999, compareAt: 3999, variants: "single", daysAgo: 14, sales: 29, images: [4, 1, 2], weight: 52, featured: 9, look: ["slim-stackable-bangles-set-of-4", "pearl-cocktail-ring"] },
  { slug: "pearl-necklace-earring-set", name: "Pearl Necklace and Earring Set", cat: "women/jewellery-sets", material: "brass", finish: "gold-tone", colors: ["white", "gold"], occasions: ["wedding", "gifting", "party-wear"], styles: ["pearl", "contemporary"], price: 2199, variants: "single", daysAgo: 80, sales: 24, images: [1, 2], weight: 30 },
  { slug: "minimal-chain-set-silver-tone", name: "Minimal Chain and Stud Set", cat: "women/jewellery-sets", material: "brass", finish: "rhodium-plated", colors: ["silver"], occasions: ["office-wear", "daily-wear", "gifting"], styles: ["minimal"], price: 1299, variants: "single", daysAgo: 30, sales: 18, images: [2, 3], weight: 9 },

  // men/chains (4)
  { slug: "fine-box-chain-stainless-steel", name: "Fine Box Chain, Stainless Steel", cat: "men/chains", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["daily-wear", "office-wear"], styles: ["minimal"], price: 899, variants: ["Length", ["18 inch", "20 inch", "22 inch"]], daysAgo: 180, sales: 64, images: [3, 2, 4], weight: 12, featured: 9, look: ["steel-bar-pendant", "minimal-steel-cuff", "brushed-signet-ring"] },
  { slug: "cuban-link-chain-gold-tone", name: "Cuban Link Chain in Gold Tone", cat: "men/chains", material: "stainless-steel", finish: "gold-tone", colors: ["gold"], occasions: ["party-wear", "daily-wear"], styles: ["statement"], price: 1799, compareAt: 2299, variants: ["Length", ["20 inch", "22 inch"]], daysAgo: 9, sales: 23, images: [3, 1], weight: 42, look: ["gold-tone-chain-ring", "om-pendant-gold-tone"] },
  { slug: "rope-chain-stainless-steel", name: "Rope Chain, Stainless Steel", cat: "men/chains", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["daily-wear"], styles: ["contemporary"], price: 1199, variants: ["Length", ["20 inch", "22 inch", "24 inch"]], daysAgo: 100, sales: 35, images: [3, 4], weight: 25 },
  { slug: "black-bead-chain", name: "Black Bead Chain", cat: "men/chains", material: "alloy", finish: "oxidised", colors: ["black"], occasions: ["daily-wear", "party-wear"], styles: ["contemporary"], price: 699, variants: "single", daysAgo: 22, sales: 11, images: [4, 3], weight: 15 },

  // men/bracelets (3)
  { slug: "cuban-link-bracelet-stainless-steel", name: "Cuban Link Bracelet", cat: "men/bracelets", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["daily-wear", "party-wear"], styles: ["statement"], price: 999, variants: "single", daysAgo: 50, sales: 40, images: [3, 2], weight: 28 },
  { slug: "leather-look-wrap-bracelet", name: "Leather-Look Wrap Bracelet", cat: "men/bracelets", material: "alloy", finish: "silver-tone", colors: ["black", "silver"], occasions: ["daily-wear"], styles: ["contemporary"], price: 549, variants: "single", daysAgo: 260, sales: 20, images: [4, 3], weight: 14 },
  { slug: "minimal-steel-cuff", name: "Minimal Steel Cuff", cat: "men/bracelets", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["office-wear", "daily-wear"], styles: ["minimal"], price: 849, variants: "single", daysAgo: 4, sales: 5, images: [3, 1], weight: 20 },

  // men/rings (3)
  { slug: "brushed-signet-ring", name: "Brushed Signet Ring", cat: "men/rings", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["daily-wear", "office-wear", "gifting"], styles: ["minimal", "contemporary"], price: 799, variants: ["Size", ["16", "18", "20", "22", "24"]], daysAgo: 110, sales: 22, images: [3, 4], weight: 9 },
  { slug: "black-band-ring", name: "Matte Black Band", cat: "men/rings", material: "stainless-steel", finish: "oxidised", colors: ["black"], occasions: ["daily-wear"], styles: ["minimal"], price: 649, variants: ["Size", ["18", "20", "22"]], daysAgo: 35, sales: 28, images: [4, 3], weight: 7 },
  { slug: "gold-tone-chain-ring", name: "Chain Ring in Gold Tone", cat: "men/rings", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["party-wear"], styles: ["statement", "contemporary"], price: 599, variants: ["Size", ["18", "20", "22"]], daysAgo: 2, sales: 3, images: [1, 3], weight: 6 },

  // men/pendants (2 + 2 with real images)
  { slug: "steel-bar-pendant", name: "Steel Bar Pendant with Chain", cat: "men/pendants", material: "stainless-steel", finish: "silver-tone", colors: ["silver"], occasions: ["daily-wear", "gifting"], styles: ["minimal"], price: 749, variants: "single", daysAgo: 65, sales: 26, images: [1, 3], weight: 10 },
  { slug: "om-pendant-gold-tone", name: "Om Pendant in Gold Tone", cat: "men/pendants", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["gifting", "daily-wear"], styles: ["traditional"], price: 699, variants: "single", daysAgo: 140, sales: 32, images: [1, 2], weight: 6 },
  { slug: "shiv-trishul-pendant-set", name: "Shiv Trishul CZ Pendant Set", cat: "men/pendants", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "gifting"], styles: ["traditional"], price: 1299, compareAt: 1799, variants: "single", daysAgo: 7, sales: 18, images: [1, 2], weight: 14, featured: 6, imageRefs: [{ src: "/products/shiv-trishul-pendant-set/shiv-trishul-pendant-set-1.jpg", alt: "Shiv Trishul CZ pendant in gold tone, close-up view showing stone detail" }, { src: "/products/shiv-trishul-pendant-set/shiv-trishul-pendant-set-2.jpg", alt: "Shiv Trishul CZ pendant set with gold mesh chain, full view" }] },
  { slug: "om-mandala-pendant-set", name: "Om Mandala CZ Pendant Set", cat: "men/pendants", material: "brass", finish: "gold-tone", colors: ["gold"], occasions: ["daily-wear", "gifting"], styles: ["traditional"], price: 1299, compareAt: 1799, variants: "single", daysAgo: 7, sales: 14, images: [1, 2], weight: 12, featured: 5, imageRefs: [{ src: "/products/om-mandala-pendant-set/om-mandala-pendant-set-1.jpg", alt: "Om mandala pendant in gold tone, close-up view showing CZ stone surround" }, { src: "/products/om-mandala-pendant-set/om-mandala-pendant-set-2.jpg", alt: "Om mandala pendant set with gold mesh chain, full view" }] },

  // women/bracelets — real image
  { slug: "triple-cz-adjustable-bracelet", name: "Triple CZ Adjustable Bracelet", cat: "women/bracelets", material: "brass", finish: "gold-tone", colors: ["gold", "white"], occasions: ["daily-wear", "gifting", "party-wear"], styles: ["contemporary", "minimal"], price: 799, compareAt: 1099, variants: "single", daysAgo: 5, sales: 22, images: [1], weight: 8, featured: 7, imageRefs: [{ src: "/products/triple-cz-adjustable-bracelet/triple-cz-adjustable-bracelet-1.jpg", alt: "Triple CZ adjustable bracelet in gold tone, worn view showing slider clasp" }] },

  // women/necklaces — real images
  { slug: "cz-solitaire-lariat-necklace", name: "CZ Solitaire Lariat Necklace", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["gold", "white"], occasions: ["party-wear", "daily-wear", "gifting"], styles: ["contemporary", "minimal"], price: 1199, compareAt: 1599, variants: "single", daysAgo: 4, sales: 19, images: [1], weight: 9, featured: 8, imageRefs: [{ src: "/products/cz-solitaire-lariat-necklace/cz-solitaire-lariat-necklace-1.jpg", alt: "CZ solitaire lariat necklace in gold tone, flat lay showing box chain and tassel drop" }] },
  { slug: "cz-snowflake-lariat-necklace", name: "CZ Snowflake Lariat Necklace", cat: "women/necklaces", material: "brass", finish: "gold-tone", colors: ["gold", "white"], occasions: ["party-wear", "gifting"], styles: ["contemporary", "statement"], price: 1099, compareAt: 1499, variants: "single", daysAgo: 4, sales: 11, images: [1], weight: 9, imageRefs: [{ src: "/products/cz-snowflake-lariat-necklace/cz-snowflake-lariat-necklace-1.jpg", alt: "CZ snowflake lariat necklace in gold tone, flat lay showing starburst pendant and tassel drop" }] },
  { slug: "antique-mangalsutra", name: "Antique Mangalsutra with Stone Pendant", cat: "women/necklaces", material: "alloy", finish: "oxidised", colors: ["gold", "multicolour", "black"], occasions: ["wedding", "daily-wear"], styles: ["traditional", "statement"], price: 1999, compareAt: 2699, variants: "single", daysAgo: 6, sales: 27, images: [1, 2], weight: 28, featured: 9, imageRefs: [{ src: "/products/antique-mangalsutra/antique-mangalsutra-1.jpg", alt: "Antique mangalsutra with black bead chain and multicolour stone floral pendant, full view" }, { src: "/products/antique-mangalsutra/antique-mangalsutra-2.jpg", alt: "Antique mangalsutra pendant close-up showing floral design with multicolour stone detail" }] },
];

const attributeLabel = (key: AttributeKey, slug: string) =>
  seedAttributes.find((a) => a.key === key)?.values.find((v) => v.slug === slug)?.label ?? slug;

function buildVariants(row: Row, index: number): { optionName: Product["optionName"]; variants: ProductVariant[] } {
  const base = `KL-${row.cat.split("/")[1]?.slice(0, 3).toUpperCase() ?? "GEN"}-${String(index + 1).padStart(4, "0")}`;
  const stock = row.stock ?? 12;
  const price = row.price * 100;
  const compare = row.compareAt !== undefined ? row.compareAt * 100 : undefined;
  if (row.variants === "single") {
    return { optionName: undefined, variants: [{ sku: base, pricePaise: price, compareAtPaise: compare, stock }] };
  }
  const [optionName, values] = row.variants;
  return {
    optionName,
    variants: values.map((v, i) => ({
      sku: `${base}-${v.replace(/\s+/g, "").toUpperCase()}`,
      optionValue: v,
      pricePaise: price,
      compareAtPaise: compare,
      // One size per multi-variant product is out of stock, one is low, so the UI states are exercised.
      stock: i === values.length - 1 ? 0 : i === 0 ? 2 : stock,
    })),
  };
}

const VIEW_LABELS = ["front view", "detail view", "worn view", "alternate view"] as const;

/** Maps each product image URL index to its placeholder file (used by `/media`). */
export const seedMediaSources: Record<string, string[]> = Object.fromEntries(
  rows.map((row) => [row.slug, row.images.map((n) => `product-${n}.svg`)]),
);

export const seedProducts: Product[] = rows.map((row, index) => {
  const { optionName, variants } = buildVariants(row, index);
  const gender: Product["gender"] = row.cat.startsWith("women") ? "women" : "men";
  const finishLabel = attributeLabel("finish", row.finish);
  const materialLabel = attributeLabel("material", row.material);
  const occasionLabels = row.occasions.map((o) => attributeLabel("occasion", o).toLowerCase()).join(", ");
  const spec = categorySpecs.find((c) => `${c.gender}/${c.slug}` === row.cat);

  return {
    id: `prod-${index + 1}`,
    slug: row.slug,
    name: row.name,
    gender,
    status: row.status ?? "active",
    primaryCategoryPath: row.cat,
    categoryPaths: [row.cat],
    tags: [],
    familyId: row.family?.[0],
    familyOptionLabel: row.family?.[1],
    attributes: {
      material: [row.material],
      finish: [row.finish],
      color: row.colors,
      occasion: row.occasions,
      style: row.styles,
    },
    optionName,
    variants,
    images: row.imageRefs
      ? row.imageRefs.map((ref) => ({ ...ref, unoptimized: true }))
      : row.images.map((_, i) => ({
          src: productImageUrl(row.slug, i),
          alt: `${row.name} in ${finishLabel.toLowerCase()}, ${VIEW_LABELS[i] ?? "view"} (placeholder image)`,
          unoptimized: true,
        })),
    shortDescription: `${row.name} in ${finishLabel.toLowerCase()} ${materialLabel.toLowerCase()}, made for ${occasionLabels}.`,
    description: [
      `Demo copy. The ${row.name.toLowerCase()} is plated in ${finishLabel.toLowerCase()} over a ${materialLabel.toLowerCase()} base and finished by hand.`,
      `It pairs with ${row.styles.map((s) => attributeLabel("style", s).toLowerCase()).join(" and ")} looks and is light enough for all-day wear.`,
    ],
    highlights: [
      `${finishLabel} finish, anti-tarnish coated`,
      "Nickel-safe, skin-friendly base",
      row.weight ? `Weighs about ${row.weight} g` : "Lightweight build",
      "Arrives in a Kesa gift box with a care card",
    ],
    stylingTips: spec?.stylingTips ?? [],
    care: "Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.",
    weightGrams: row.weight,
    dimensions: spec?.dimensions,
    hsnCode: "7117",
    gstRateBp: 300,
    returnPolicy: row.cat.endsWith("earrings") ? "exchange_only" : "returnable",
    lowStockThreshold: 3,
    completeTheLookSlugs: row.look ?? [],
    publishedAt: daysAgo(row.daysAgo),
    sales30d: row.sales,
    sortWeight: row.featured ?? 0,
  };
});

/* ----------------------------------------------------------- collections */

const occasionCollection = (
  slug: string,
  occasion: string,
  name: string,
  intro: string,
  body: string[],
  position: number,
): Collection => ({
  id: `col-${slug}`,
  slug,
  name,
  intro,
  body,
  kind: "rule",
  rule: { type: "attribute", key: "occasion", values: [occasion] },
  defaultSort: "featured",
  isVisible: true,
  position,
  image: placeholder(2, ""),
});

export const seedCollections: Collection[] = [
  {
    id: "col-new-arrivals",
    slug: "new-arrivals",
    name: "New Arrivals",
    intro: "The latest pieces across women's and men's jewellery, added in the last 30 days.",
    body: ["New pieces land every fortnight. This edit refreshes itself, so bookmark it if you like being first."],
    kind: "rule",
    rule: { type: "new_arrivals", withinDays: 30 },
    defaultSort: "newest",
    seoTitle: "New Arrivals | Kesa Lifestyle",
    seoDescription: "New fashion jewellery for women and men, updated every fortnight. Earrings, necklaces, chains, rings and more.",
    isVisible: true,
    position: 1,
    image: placeholder(1, ""),
  },
  {
    id: "col-bestsellers",
    slug: "bestsellers",
    name: "Bestsellers",
    intro: "Our most-bought pieces over the last 30 days. Ranked by what customers actually order.",
    body: ["The bestseller list is calculated from real orders, not curated. It changes as tastes do."],
    kind: "rule",
    rule: { type: "bestsellers", limit: 24 },
    defaultSort: "bestselling",
    seoTitle: "Bestselling Jewellery | Kesa Lifestyle",
    seoDescription: "The most-loved Kesa pieces, ranked by orders. Pearl earrings, fine chains, stackable rings and more.",
    isVisible: true,
    position: 2,
    image: placeholder(3, ""),
  },
  occasionCollection(
    "wedding-jewellery",
    "wedding",
    "Wedding Jewellery",
    "Kundan sets, chandbalis, pearl chokers and bangles for the ceremony, the reception and every function in between.",
    [
      "For the bride's circle, think in sets: a necklace and earring pair carries the look and bangles finish it. For guests, one statement piece is enough.",
      "All wedding pieces are plated over hypoallergenic bases, so they are comfortable for long days.",
    ],
    3,
  ),
  occasionCollection(
    "party-wear-jewellery",
    "party-wear",
    "Party Wear Jewellery",
    "Statement earrings, cocktail rings and chains that hold their own after dark.",
    ["Pick one hero: big earrings with a bare neck, or a layered necklace with studs. Never both at full volume."],
    4,
  ),
  occasionCollection(
    "daily-wear-jewellery",
    "daily-wear",
    "Daily Wear Jewellery",
    "Lightweight hoops, fine chains, stackable rings and steel pieces you can forget you are wearing.",
    ["Daily wear means sweat, sun and sleeves. Everything here is anti-tarnish coated or stainless steel and weighs next to nothing."],
    5,
  ),
  occasionCollection(
    "office-wear-jewellery",
    "office-wear",
    "Office Wear Jewellery",
    "Minimal pieces that read polished on video calls and in person.",
    ["Keep to one metal tone and two pieces. Small hoops or studs plus a fine chain is the uniform."],
    6,
  ),
  occasionCollection(
    "gifting-jewellery",
    "gifting",
    "Gifting Jewellery",
    "Gift-ready pieces for birthdays, anniversaries and festivals, boxed with a care card.",
    ["Not sure of a size? Earrings, pendants and adjustable rings are safe choices. Every order can include a printed message."],
    7,
  ),
];
