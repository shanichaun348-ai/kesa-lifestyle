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
    ],
  },
  // The "Collections" menu was removed from the header at the owner's request (21 Oct 2026),
  // and the Women menu's "Shop by occasion" column on 2 Nov 2026; /collections/ and the
  // occasion collections stay reachable from the footer and the /occasion/ page.
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
      { label: "Contact us", href: "/contact/" },
      { label: "Grievance officer", href: "/grievance-officer/" },
    ],
  },
];
