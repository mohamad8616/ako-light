import type { Localized } from "@/lib/i18n/localized";

export interface RelatedProduct {
  name: Localized;
  slug: string;
  category: string;
  image: string;
}

export interface DownloadLink {
  label: Localized;
  href: string;
}

export interface Product {
  id: string;
  name: Localized;
  slug: string;
  images: string[];
  hoverImage: string;
  /** EUR price — shown to en-locale visitors, informational only. */
  priceEur: number;
  /**
   * Toman price — shown to fa-locale visitors and the only value charged at
   * checkout (x10 to Rial at the ZarinPal boundary). priceToman <= 0 means
   * "not available for purchase" (buy button disabled, like !existsInStore).
   */
  priceToman: number;
  store: {
    existsInStore: boolean;
    quantity: number;
  };
  category: string;
  categoryLabel?: Localized;
  heroImage: string;
  description: Localized;
  moreInfo?: Localized;
  downloads: DownloadLink[];
  designer: { name: Localized; href: string };
  related: RelatedProduct[];
}

export interface ProductCategory {
  id: string;
  name: Localized;
  slug: string;
  i18nKey: string;
  products: Product[];
}

/**
 * The shape the navigation menu needs — `ProductCategory` minus `products`.
 *
 * The nav renders one link per category and reads only `slug` (the route) and
 * `i18nKey` (the localized label); it never touches `products`. Typing the
 * nav on this narrower shape is what stops a caller from accidentally passing
 * the full catalog back into the client payload.
 *
 * Lives in this pure-data module (no Prisma, no server imports) so client
 * components can import it safely.
 */
export interface NavCategory {
  id: string;
  slug: string;
  i18nKey: string;
}
