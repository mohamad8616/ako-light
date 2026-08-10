export interface MenuLink {
  label: string;
  href: string;
}

export interface MenuSection {
  title: string;
  links: MenuLink[];
}

export const menu: MenuSection[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "S-34", href: "/s-34" },
      { label: "Designers", href: "/designers" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Collections", href: "/collections" },
      { label: "Materials", href: "/materials" },
      { label: "Projects", href: "/projects" },
      { label: "2D/3D", href: "https://area.henge07.com" },
      { label: "H-Fragrance", href: "https://34.henge07.com" },
    ],
  },
  {
    title: "Media",
    links: [
      { label: "Media Kit", href: "/media-kit" },
      { label: "Press Clippings", href: "/journal" },
      { label: "Catalogues", href: "/catalogues" },
      { label: "H-Life", href: "/hlife" },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "Flagships", href: "/showrooms" },
      { label: "Store Finder", href: "/network-map" },
      { label: "Contacts", href: "/contact" },
    ],
  },
];