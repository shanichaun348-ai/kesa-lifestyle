/**
 * ─────────────────────────────────────────────────────────────────────────
 * DEMO DATA — HOMEPAGE CONTENT
 *
 * Mirrors the shapes the `homepage_sections`, `guides`, `journal_posts`,
 * `reviews` and UGC tables will provide (docs/05 §8). All copy, names and
 * imagery are placeholders for layout review. Facts that depend on owner
 * decisions (shipping threshold D4, return window D7) are marked `pending`.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { ProductCardData } from "@/components/storefront/product-card";

import { demoProducts } from "./catalog";

export type DemoImage = { src: string; alt: string; unoptimized?: boolean | undefined };

const placeholder = (file: string, alt: string): DemoImage => ({
  src: `/placeholders/${file}`,
  alt,
  unoptimized: true,
});

export const demoHero = {
  eyebrow: "New season",
  title: "Jewellery that completes your look.",
  lead: "Lightweight, skin-friendly pieces for every day and every occasion. Designed in India, made to be worn.",
  primary: { label: "Shop women", href: "/women/" },
  secondary: { label: "Shop men", href: "/men/" },
  image: placeholder("hero-1.svg", "Placeholder: model wearing layered gold-tone necklaces"),
};

export const demoGenderTiles = [
  {
    title: "Women",
    description: "Earrings, necklaces, rings, bracelets, bangles and sets.",
    href: "/women/",
    image: placeholder("category-women.svg", "Placeholder: women's jewellery edit"),
  },
  {
    title: "Men",
    description: "Chains, bracelets, rings and pendants.",
    href: "/men/",
    image: placeholder("category-men.svg", "Placeholder: men's jewellery edit"),
  },
] as const;

export const demoCategories = [
  { label: "Earrings", href: "/women/earrings/", image: placeholder("product-1.svg", "") },
  { label: "Necklaces", href: "/women/necklaces/", image: placeholder("product-2.svg", "") },
  { label: "Rings", href: "/women/rings/", image: placeholder("product-3.svg", "") },
  { label: "Bracelets", href: "/women/bracelets/", image: placeholder("product-4.svg", "") },
  { label: "Jewellery sets", href: "/women/jewellery-sets/", image: placeholder("product-2.svg", "") },
  { label: "Men's chains", href: "/men/chains/", image: placeholder("product-3.svg", "") },
] as const;

const byIndex = (...idx: number[]): ProductCardData[] =>
  idx.map((i) => demoProducts[i]).filter((p): p is ProductCardData => p !== undefined);

export const demoLook = {
  eyebrow: "Shop the look",
  title: "The Sunday brunch edit",
  description: "Three pieces that work together: a layered necklace, huggie hoops and a signet ring. Wear all three or start with one.",
  image: placeholder("look-1.svg", "Placeholder: model wearing the brunch edit"),
  products: byIndex(2, 4, 5),
  href: "/collections/demo-sunday-brunch-edit/",
};

export const demoBrandStatement = {
  eyebrow: "Why we make jewellery",
  statement: "Good jewellery should not be precious about being worn. Ours is made for the commute, the wedding and the Tuesday in between.",
  body: "Every Kesa piece is plated over a hypoallergenic base, checked by hand and sold at a price that lets you build a collection rather than own one special thing.",
  link: { label: "Our story", href: "/about/" },
  image: placeholder("editorial-1.svg", "Placeholder: Kesa workshop detail"),
};

export const demoStylingGuides = [
  {
    title: "What jewellery to wear with a saree",
    excerpt: "Neckline first, then earrings. A styling guide for every drape.",
    href: "/style-guides/jewellery-for-saree/",
    image: placeholder("editorial-1.svg", "Placeholder: saree styling guide cover"),
  },
  {
    title: "Earrings for your face shape",
    excerpt: "Drops, hoops or studs: how to choose what flatters.",
    href: "/style-guides/earrings-for-your-face-shape/",
    image: placeholder("product-1.svg", "Placeholder: earrings guide cover"),
  },
  {
    title: "Jewellery for office wear",
    excerpt: "Minimal pieces that read polished on video calls and in person.",
    href: "/style-guides/jewellery-for-office-wear/",
    image: placeholder("editorial-2.svg", "Placeholder: office wear guide cover"),
  },
] as const;

/** Store facts. Items marked `pending` depend on owner decisions and must be confirmed before launch. */
export const demoWhyKesa = [
  { title: "Anti-tarnish plating", body: "Keeps its finish through daily wear with simple care.", icon: "shield" },
  { title: "Skin-friendly", body: "Nickel-safe, hypoallergenic base metals.", icon: "leaf" },
  { title: "Free shipping over ₹999", body: "Across India. Pending decision D4.", icon: "truck", pending: true },
  { title: "7-day easy returns", body: "Unworn pieces, no questions. Pending decision D7.", icon: "refresh", pending: true },
] as const;

export const demoReviews = [
  {
    id: "demo-r1",
    rating: 5,
    title: "Looks far more expensive than it is",
    body: "Wore the pearl drops to a wedding and got asked where they were from three times. Light enough to wear all day.",
    author: "Sample reviewer",
    location: "Mumbai",
    product: "Pearl Drop Earrings in Gold Tone",
  },
  {
    id: "demo-r2",
    rating: 4,
    title: "Great everyday chain",
    body: "Thin enough to layer, strong clasp, no colour change after two months of daily wear.",
    author: "Sample reviewer",
    location: "Bengaluru",
    product: "Fine Box Chain, Stainless Steel",
  },
  {
    id: "demo-r3",
    rating: 5,
    title: "Packaging made it a perfect gift",
    body: "Bought the huggies for my sister. The box and the care card made it feel like a proper present.",
    author: "Sample reviewer",
    location: "Delhi",
    product: "Minimal Huggie Hoops",
  },
] as const;

/**
 * UGC architecture: each post carries its source and permalink so the grid
 * can attribute and link out. In production this array is produced by an
 * admin-curated `ugc_posts` table fed manually or via the Instagram Graph API.
 */
export type UgcPost = {
  id: string;
  source: "instagram";
  handle: string;
  permalink: string;
  image: DemoImage;
  productHref?: string | undefined;
};

export const demoUgcPosts: UgcPost[] = [1, 2, 3, 4, 2, 1].map((n, i) => ({
  id: `demo-ugc-${i + 1}`,
  source: "instagram",
  handle: "kesalifestyle",
  permalink: "https://www.instagram.com/",
  image: placeholder(`product-${n}.svg`, `Placeholder: customer photo ${i + 1}`),
  productHref: i % 2 === 0 ? "/products/demo-pearl-drop-earrings-gold-tone/" : undefined,
}));

export const demoJournalPosts = [
  {
    slug: "demo-how-to-care-for-gold-plated-jewellery",
    title: "How to care for gold-plated jewellery",
    excerpt: "Five habits that keep plated pieces bright for years, and the two things that ruin them fastest.",
    category: "Care",
    readingMinutes: 4,
    image: placeholder("editorial-1.svg", "Placeholder: jewellery care article cover"),
  },
  {
    slug: "demo-layering-chains-for-men",
    title: "Layering chains: a guide for men",
    excerpt: "Lengths, widths and how many is too many.",
    category: "Styling",
    readingMinutes: 3,
    image: placeholder("editorial-2.svg", "Placeholder: chains article cover"),
  },
  {
    slug: "demo-festive-edit-under-999",
    title: "The festive edit under ₹999",
    excerpt: "Statement pieces that do the work without the price tag.",
    category: "Edits",
    readingMinutes: 3,
    image: placeholder("product-4.svg", "Placeholder: festive edit cover"),
  },
] as const;
