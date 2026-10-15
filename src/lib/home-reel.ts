/**
 * Short product films on the homepage ("Kesa in motion"). Each is a 9:16
 * clip of about ten seconds that ends on the Kesa logo, self-hosted under
 * /videos/home/ with a still from the clip as its poster. Clips carry
 * sound, so they start muted and the viewer turns sound on per clip.
 */
export type HomeReelItem = {
  id: string;
  src: string;
  poster: string;
  /** Printed over the film in the display serif and spoken for screen readers, in title case. */
  title: string;
  caption: string;
  href: string;
  cta: string;
};

export const homeReel: readonly HomeReelItem[] = [
  {
    id: "crystal-flower-necklace",
    src: "/videos/home/crystal-flower-necklace.mp4",
    poster: "/videos/home/crystal-flower-necklace.jpg",
    title: "Crystal Flower Pendant Necklace",
    caption: "A gold-tone chain with a crystal bloom and twin tassel drops, worn and on marble.",
    href: "/women/necklaces/",
    cta: "Shop Necklaces",
  },
  {
    id: "teardrop-earrings",
    src: "/videos/home/teardrop-earrings.mp4",
    poster: "/videos/home/teardrop-earrings.jpg",
    title: "Teardrop Tassel Earrings",
    caption: "Gold-tone filigree teardrops with crystal detail and chain tassels, on a stand and worn with cream.",
    href: "/women/earrings/",
    cta: "Shop Earrings",
  },
  {
    id: "gem-charm-bracelet",
    src: "/videos/home/gem-charm-bracelet.mp4",
    poster: "/videos/home/gem-charm-bracelet.jpg",
    title: "Gem Charm Bracelet",
    caption: "A fine gold-tone chain bracelet with square red, teal, black, pink and green charms on champagne velvet.",
    href: "/women/bracelets/",
    cta: "Shop Bracelets",
  },
  {
    id: "antique-mangalsutra",
    src: "/videos/home/antique-mangalsutra.mp4",
    poster: "/videos/home/antique-mangalsutra.jpg",
    title: "Antique Mangalsutra",
    caption: "Black bead chains with an antique gold-tone square pendant set with stones, on green velvet.",
    href: "/women/mangalsutras/",
    cta: "Shop Mangalsutras",
  },
  {
    id: "filigree-mangalsutra",
    // Shares the file the phone hero slide plays, so a visitor downloads it once.
    src: "/videos/hero/mangalsutra-mobile.mp4",
    poster: "/videos/hero/mangalsutra-mobile.jpg",
    title: "Filigree Mangalsutra",
    caption: "An antique gold-tone mangalsutra with a filigree pendant, green and ruby stones and black bead chains, on cream silk.",
    href: "/women/mangalsutras/",
    cta: "Shop Mangalsutras",
  },
];
