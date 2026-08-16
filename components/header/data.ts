export interface MenuLink {
  label: string;
  href: string;
  /** Translation key, e.g. "menu.aboutUs" */
  i18nKey: string;
}

export interface MenuSection {
  title: string;
  links: MenuLink[];
  /** Translation key for the column heading, e.g. "menu.company" */
  i18nKey: string;
}

export const menu: MenuSection[] = [
  {
    title: "Company",
    i18nKey: "menu.company",
    links: [
      { label: "About Us", href: "/about", i18nKey: "menu.aboutUs" },
      { label: "S-34", href: "/s-34", i18nKey: "menu.s34" },
      { label: "Designers", href: "/designers", i18nKey: "menu.designers" },
    ],
  },
  {
    title: "Products",
    i18nKey: "menu.products",
    links: [
      { label: "All Products", href: "/products", i18nKey: "menu.allProducts" },
      { label: "Collections", href: "/collections", i18nKey: "menu.collections" },
      { label: "Materials", href: "/materials", i18nKey: "menu.materials" },
      { label: "Projects", href: "/projects", i18nKey: "menu.projects" },
      {
        label: "2D/3D",
        href: "https://area.henge07.com",
        i18nKey: "menu.twoDThreeD",
      },
      {
        label: "H-Fragrance",
        href: "https://34.henge07.com",
        i18nKey: "menu.hFragrance",
      },
    ],
  },
  {
    title: "Media",
    i18nKey: "menu.media",
    links: [
      { label: "Media Kit", href: "/media-kit", i18nKey: "menu.mediaKit" },
      {
        label: "Press Clippings",
        href: "/journal",
        i18nKey: "menu.pressClippings",
      },
      { label: "Catalogues", href: "/catalogues", i18nKey: "menu.catalogues" },
      { label: "H-Life", href: "/hlife", i18nKey: "menu.hLife" },
    ],
  },
  {
    title: "Network",
    i18nKey: "menu.network",
    links: [
      { label: "Flagships", href: "/showrooms", i18nKey: "menu.flagships" },
      {
        label: "Store Finder",
        href: "/network-map",
        i18nKey: "menu.storeFinder",
      },
      { label: "Contacts", href: "/contact", i18nKey: "menu.contacts" },
    ],
  },
];
