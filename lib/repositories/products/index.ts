/**
 * Product reads and writes.
 *
 * The public API mirrors the static module it replaced
 * (`lib/data/productCategories.ts`) so call sites change minimally, and every
 * reader is wrapped in React's `cache()` so repeated lookups inside one request
 * (page + `generateMetadata`, nested layouts) hit the database once.
 *
 * STRUCTURE
 *
 * This was one 524-line module covering the row mapping, the public reads, the
 * picker options, the admin DTOs and the writes. They are now separate modules
 * and this barrel re-exports the union, so importers keep the specifier they
 * already use (`@/lib/repositories/products`):
 *
 *   ./map         productInclude, ProductRow, mapProductRow
 *   ./read        public-site reads (by slug, all, by category, by ids/slugs)
 *   ./options     the `ProductsUsedField` picker options
 *   ./admin-read  the dashboard row and edit-form DTOs
 *   ./write       create / update / delete
 *
 * The split is by RUNTIME CONSUMER, not by line count: the public reads are on
 * the visitor's path and are the ones to keep small and auditable, while
 * `./admin-read` and `./write` are reached only from the authenticated
 * dashboard. Keeping them in separate modules means a change to an admin DTO
 * cannot accidentally alter what a public page imports.
 */
export { productInclude, mapProductRow } from "./map";
export type { ProductRow } from "./map";

export {
  getProduct,
  getProducts,
  getProductsByCategory,
  getProductsByIdsOrSlugs,
} from "./read";

export { getProductOptions } from "./options";
export type { ProductOption } from "./options";

export { getProductAdminRows, getProductAdminDetail } from "./admin-read";
export type { ProductAdminRow, ProductAdminDetail } from "./admin-read";

export { createProduct, updateProduct, deleteProduct } from "./write";
export type { ProductWriteInput } from "./write";
