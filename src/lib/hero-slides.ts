import type { HeroSlide } from "@/components/home/hero-carousel";

/**
 * Homepage hero slides. Every slide ships two files: the 2.4:1 banner for
 * tablets and up, and a 4:5 portrait for phones, so the carousel box is the
 * same height for every slide on a phone (a landscape-only slide would sit
 * in a tall box with empty space under it).
 */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/videos/hero/mangalsutra-desktop-v2.jpg",
    mobileSrc: "/videos/hero/mangalsutra-mobile.jpg",
    video: { src: "/videos/hero/mangalsutra-desktop-v2.mp4", mobileSrc: "/videos/hero/mangalsutra-mobile.mp4" },
    holdMs: 10000,
    alt: "An antique gold mangalsutra with a filigree pendant and black bead chains, beside a gold gem charm bracelet on cream silk.",
    href: "/women/mangalsutras/",
    cta: "Shop mangalsutras",
  },
  {
    src: "/images/hero/timeless-elegance-desktop.jpg",
    mobileSrc: "/images/hero/timeless-elegance-mobile.jpg",
    alt: "Timeless Elegance for every you. A gold-tone crystal flower pendant necklace on a navy velvet display bust with a gilded tray and baby's breath.",
    href: "/women/pendants/",
    cta: "Shop pendants",
  },
  {
    src: "/images/hero/elegance-in-every-detail-desktop-v2.jpg",
    mobileSrc: "/images/hero/elegance-in-every-detail-mobile.jpg",
    alt: "Elegance in Every Detail. Jewellery that speaks your style. A smiling model in black velvet wearing gold-tone crystal leaf earrings and a matching tassel pendant necklace against plum velvet.",
    href: "/women/necklaces/",
    cta: "Shop necklaces",
  },
  {
    src: "/images/hero/grace-in-every-moment-desktop.jpg",
    mobileSrc: "/images/hero/grace-in-every-moment-mobile.jpg",
    alt: "Grace in Every Moment. Timeless jewellery for your beautiful story. A smiling model in a pink embroidered saree wearing gold-tone crystal drop earrings, a crystal necklace and a gem charm bracelet.",
    href: "/women/",
    cta: "Shop women's jewellery",
  },
  {
    src: "/images/hero/gift-her-sparkle-desktop.jpg",
    mobileSrc: "/images/hero/gift-her-sparkle-mobile.jpg",
    alt: "The Gift Edit — Gift her sparkle. Wrapped and ready to treasure. A gold-tone crystal pendant necklace draped over a black gift box.",
    href: "/occasion/gifting/",
    cta: "Shop gifts",
  },
  {
    src: "/images/hero/midnight-in-bloom-desktop.jpg",
    mobileSrc: "/images/hero/midnight-in-bloom-mobile.jpg",
    alt: "New launch — Midnight in Bloom. Petal Sparkle. A gold-tone crystal pendant necklace on midnight-blue satin with a white orchid.",
    href: "/collections/new-arrivals/",
    cta: "Shop Petal Sparkle",
  },
];
