import { accessories } from "./accessories";
import { bedroom } from "./bedroom";
import { bookcases } from "./bookcases";
import { cabinetsAndSideboards } from "./cabinets-and-sideboards";
import { chairsAndStools } from "./chairs-and-stools";
import { coffeeTables } from "./coffee-tables";
import { commonDownloads } from "./commonDownloads";
import { kitchens } from "./kitchens";
import { lighting } from "./lighting";
import { sofasAndArmchairs } from "./sofas-and-armchairs";
import { tables } from "./tables";
import type {
  DownloadLink,
  Product,
  ProductCategory,
  RelatedProduct,
} from "./types";
import { wallPanelling } from "./wall-panelling";

// Aggregate the per-category modules in the exact order used across the site
// (preserved from the original productCategories.ts before the Pass 8.0 split -
// the order drives category listing and navigation, do not reorder casually).
export const productCategories: ProductCategory[] = [
  lighting,
  bookcases,
  cabinetsAndSideboards,
  tables,
  coffeeTables,
  sofasAndArmchairs,
  chairsAndStools,
  kitchens,
  bedroom,
  wallPanelling,
  accessories,
];

export const products: Product[] = productCategories.flatMap((c) => c.products);

export function getProduct(
  category: string,
  slug: string,
): Product | undefined {
  return products.find((p) => p.category === category && p.slug === slug);
}

export { commonDownloads };
export type { DownloadLink, Product, ProductCategory, RelatedProduct };
