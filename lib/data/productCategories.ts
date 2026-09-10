// Pass 8.0 structural refactor: the original 1,075-line data module was split
// into per-category modules under "./product-categories/". This file remains
// the single public entry point - every existing
// "@/lib/data/productCategories" import keeps resolving exactly as before.
export { commonDownloads } from "./product-categories/commonDownloads";
export { getProduct, productCategories, products } from "./product-categories";
export type {
  DownloadLink,
  Product,
  ProductCategory,
  RelatedProduct,
} from "./product-categories/types";
