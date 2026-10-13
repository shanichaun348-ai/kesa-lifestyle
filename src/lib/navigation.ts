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
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
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
          { label: "Pendants", href: "/women/pendants/" },
          { label: "Mangalsutras", href: "/women/mangalsutras/" },
          { label: "Earrings", href: "/women/earrings/" },
          { label: "Bracelets", href: "/women/bracelets/" },
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
      image: { src: "/placeholders/editorial-1.svg", alt: "Layered pearl necklaces on a linen backdrop", unoptimized: true },
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
];

export const sampleFooterColumns: FooterColumn[] = [
  {
    heading: "Shop",
    links: [
      { label: "Women", href: "/women/" },
      { label: "New arrivals", href: "/collections/new-arrivals/" },
      { label: "Bestsellers", href: "/collections/bestsellers/" },
      { label: "Collections", href: "/collections/" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Shipping", href: "/shipping-policy/" },
      { label: "Returns", href: "/returns-policy/" },
      { label: "Track order", href: "/track-order/" },
      { label: "Grievance officer", href: "/grievance-officer/" },
    ],
  },
  {
    heading: "Kesa",
    links: [
      { label: "Style guides", href: "/style-guides/" },
    ],
  },
];
