/**
 * Navigation types. In production these structures are loaded from the
 * `navigation_menus` / `navigation_items` tables (docs/05 §8); the sample data
 * below exists only so the design-system showcase can render the chrome.
 */

export type NavLink = {
  label: string;
  href: string;
};

export type NavColumn = {
  heading: string;
  links: NavLink[];
};

export type NavFeature = {
  title: string;
  href: string;
  image: { src: string; alt: string };
};

export type NavMenu = NavLink & {
  columns?: NavColumn[];
  feature?: NavFeature;
};

export type FooterColumn = {
  heading: string;
  links: NavLink[];
};

export const sampleHeaderMenus: NavMenu[] = [
  {
    label: "Women",
    href: "/women/",
    columns: [
      {
        heading: "Shop by type",
        links: [
          { label: "Necklaces", href: "/women/necklaces/" },
          { label: "Earrings", href: "/women/earrings/" },
          { label: "Rings", href: "/women/rings/" },
          { label: "Bracelets", href: "/women/bracelets/" },
          { label: "Bangles", href: "/women/bangles/" },
          { label: "Jewellery sets", href: "/women/jewellery-sets/" },
        ],
      },
      {
        heading: "Shop by occasion",
        links: [
          { label: "Daily wear", href: "/collections/daily-wear-jewellery/" },
          { label: "Office wear", href: "/collections/office-wear-jewellery/" },
          { label: "Party wear", href: "/collections/party-wear-jewellery/" },
          { label: "Wedding", href: "/collections/wedding-jewellery/" },
          { label: "Gifting", href: "/collections/gifting-jewellery/" },
        ],
      },
    ],
    feature: {
      title: "The pearl edit",
      href: "/collections/pearl-edit/",
      image: { src: "/placeholders/editorial-1.svg", alt: "Layered pearl necklaces on a linen backdrop" },
    },
  },
  {
    label: "Men",
    href: "/men/",
    columns: [
      {
        heading: "Shop by type",
        links: [
          { label: "Chains", href: "/men/chains/" },
          { label: "Bracelets", href: "/men/bracelets/" },
          { label: "Rings", href: "/men/rings/" },
          { label: "Pendants", href: "/men/pendants/" },
        ],
      },
      {
        heading: "Edits",
        links: [
          { label: "Everyday essentials", href: "/collections/men-everyday/" },
          { label: "Layering chains", href: "/collections/layering-chains/" },
        ],
      },
    ],
    feature: {
      title: "Minimal chains",
      href: "/collections/layering-chains/",
      image: { src: "/placeholders/editorial-2.svg", alt: "Fine steel chains arranged on stone" },
    },
  },
  {
    label: "Collections",
    href: "/collections/",
    columns: [
      {
        heading: "Featured",
        links: [
          { label: "New arrivals", href: "/collections/new-arrivals/" },
          { label: "Bestsellers", href: "/collections/bestsellers/" },
          { label: "Anti-tarnish", href: "/collections/anti-tarnish-jewellery/" },
          { label: "Under ₹999", href: "/collections/under-999/" },
        ],
      },
    ],
  },
  { label: "New In", href: "/collections/new-arrivals/" },
  { label: "Journal", href: "/journal/" },
];

export const sampleFooterColumns: FooterColumn[] = [
  {
    heading: "Shop",
    links: [
      { label: "Women", href: "/women/" },
      { label: "Men", href: "/men/" },
      { label: "New arrivals", href: "/collections/new-arrivals/" },
      { label: "Bestsellers", href: "/collections/bestsellers/" },
      { label: "Collections", href: "/collections/" },
      { label: "Gift guides", href: "/gift-guides/" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Contact", href: "/contact/" },
      { label: "FAQ", href: "/faq/" },
      { label: "Shipping", href: "/shipping-policy/" },
      { label: "Returns", href: "/returns-policy/" },
      { label: "Track order", href: "/track-order/" },
      { label: "Jewellery care", href: "/jewellery-care/" },
    ],
  },
  {
    heading: "Kesa",
    links: [
      { label: "About", href: "/about/" },
      { label: "Journal", href: "/journal/" },
      { label: "Style guides", href: "/style-guides/" },
      { label: "Size guide", href: "/size-guide/" },
      { label: "Grievance officer", href: "/grievance-officer/" },
    ],
  },
];
