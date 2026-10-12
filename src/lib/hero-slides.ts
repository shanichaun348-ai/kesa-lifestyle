import type { HeroSlide } from "@/components/home/hero-carousel";

/**
 * Homepage hero slides. Every slide ships two files: the 2.4:1 banner for
 * tablets and up, and a 4:5 portrait for phones, so the carousel box is the
 * same height for every slide on a phone (a landscape-only slide would sit
 * in a tall box with empty space under it).
 */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/images/hero/necklace-showcase.jpg",
    mobileSrc: "/images/hero/necklace-showcase-mobile.jpg",
    alt: "A model in a black embroidered saree wearing a gold-tone crystal pendant necklace, beside gold-tone crystal lariat necklaces and an Om pendant on display stands.",
    href: "/women/necklaces/",
    cta: "Shop necklaces",
  },
  {
    src: "/images/hero/necklace-edit.jpg",
    mobileSrc: "/images/hero/necklace-edit-mobile.jpg",
    alt: "Kesa Lifestyle new collection — The Necklace Edit. Grace you can wear, every day. Gold-tone crystal pendant necklaces on display stands and a model wearing one.",
    href: "/women/necklaces/",
    cta: "Shop The Necklace Edit",
  },
  {
    src: "/images/hero/everyday-grace-desktop.jpg",
    mobileSrc: "/images/hero/everyday-grace-mobile.jpg",
    alt: "New launch — Everyday Grace. Crafted to shine with you. Crystal Drop Edit. A model in black velvet wearing a gold-tone crystal drop necklace.",
    href: "/collections/new-arrivals/",
    cta: "Shop the Crystal Drop Edit",
  },
  {
    src: "/images/hero/golden-bloom-desktop.jpg",
    mobileSrc: "/images/hero/golden-bloom-mobile.jpg",
    alt: "Festive Edit — Golden Bloom. Light up every celebration. A gold-tone crystal flower pendant necklace on a black display bust.",
    href: "/occasion/festive-jewellery/",
    cta: "Shop the Festive Edit",
  },
  {
    src: "/images/hero/midnight-in-bloom-desktop.jpg",
    mobileSrc: "/images/hero/midnight-in-bloom-mobile.jpg",
    alt: "New launch — Midnight in Bloom. Petal Sparkle. A gold-tone crystal pendant necklace on midnight-blue satin with a white orchid.",
    href: "/collections/new-arrivals/",
    cta: "Shop Petal Sparkle",
  },
  {
    src: "/images/hero/soft-glow-desktop.jpg",
    mobileSrc: "/images/hero/soft-glow-mobile.jpg",
    alt: "Kesa Lifestyle everyday luxe — Soft Glow. Light pieces, lasting shine. A gold-tone crystal flower pendant necklace on a cream display bust.",
    href: "/women/necklaces/",
    cta: "Shop Soft Glow",
  },
  {
    src: "/images/hero/gift-her-sparkle-desktop.jpg",
    mobileSrc: "/images/hero/gift-her-sparkle-mobile.jpg",
    alt: "The Gift Edit — Gift her sparkle. Wrapped and ready to treasure. A gold-tone crystal pendant necklace draped over a black gift box.",
    href: "/occasion/gifting/",
    cta: "Shop gifts",
  },
];
