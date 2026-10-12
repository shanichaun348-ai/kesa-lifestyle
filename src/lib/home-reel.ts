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
  /** Spoken for screen readers and shown over the clip. */
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
    title: "Crystal flower pendant necklace",
    caption: "A gold-tone chain with a crystal bloom and twin tassel drops, worn and on marble.",
    href: "/women/necklaces/",
    cta: "Shop necklaces",
  },
  {
    id: "teardrop-earrings",
    src: "/videos/home/teardrop-earrings.mp4",
    poster: "/videos/home/teardrop-earrings.jpg",
    title: "Teardrop tassel earrings",
    caption: "Gold-tone filigree teardrops with crystal detail and chain tassels, on a stand and worn with cream.",
    href: "/women/earrings/",
    cta: "Shop earrings",
  },
  {
    id: "gem-charm-bracelet",
    src: "/videos/home/gem-charm-bracelet.mp4",
    poster: "/videos/home/gem-charm-bracelet.jpg",
    title: "Gem charm bracelet",
    caption: "A fine gold-tone chain bracelet with square red, teal, black, pink and green charms on champagne velvet.",
    href: "/women/bracelets/",
    cta: "Shop bracelets",
  },
  {
    id: "antique-mangalsutra",
    src: "/videos/home/antique-mangalsutra.mp4",
    poster: "/videos/home/antique-mangalsutra.jpg",
    title: "Antique mangalsutra",
    caption: "Black bead chains with an antique gold-tone square pendant set with stones, on green velvet.",
    href: "/women/necklaces/",
    cta: "Shop mangalsutras",
  },
];
