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
  price: number;
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
