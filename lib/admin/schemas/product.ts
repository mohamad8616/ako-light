import { z } from "zod";
import {
  documentFilenameSchema,
  documentRefSchema,
  ID_MAX,
  idSchema,
  imageRefSchema,
  localizedSchema,
  nameSchema,
  relatedProductsSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The product form's rules — structurally identical to the repository's
 * `ProductWriteInput` (lib/repositories/products.ts), which is what the server
 * action actually persists. Images are validated here but saved through
 * `syncProductImages` inside the product's transaction.
 */
export const productImageSchema = z.object({
  /** Present only for rows that already exist for this product. */
  id: z.string().min(1).max(ID_MAX).optional(),
  /** Bounded by `imageRefSchema` (URL_MAX) — an unbounded url is stored and
   * rendered by every product page. */
  url: imageRefSchema,
  /** Alt text: a sentence or two, never an essay. */
  alt: nameSchema.nullable(),
  isPrimary: z.boolean(),
});

export const productFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  hoverImage: imageRefSchema,
  heroImage: imageRefSchema,
  /// EUR price — informational display for en-locale visitors.
  priceEur: z.number().positive(),
  /// Toman price — the value actually charged at checkout (ZarinPal).
  priceToman: z.number().positive(),
  existsInStore: z.boolean(),
  quantity: z.number().int().min(0),
  description: localizedSchema,
  /** SQL NULL when the product has no extra info block. */
  moreInfo: localizedSchema.nullable(),
  /**
   * Download links (prisma `Product.downloads` jsonb).
   *
   * `href` is an UPLOADED document URL, so it is constrained the same way a
   * catalogue card's `pdfUrl` is — a PDF/PowerPoint reference, not a free-form
   * link. `name` is the presentable filename the download route echoes into
   * `Content-Disposition`; it is OPTIONAL because a row saved before the upload
   * field existed has none, and the route derives it from the storage key then.
   */
  downloads: z.array(
    z.object({
      label: localizedSchema,
      href: documentRefSchema,
      name: documentFilenameSchema.optional(),
    }),
  ),
  /**
   * Related products — the denormalized jsonb snapshot the product page
   * renders. Floored at ONE (see `relatedProductsSchema` in ./common): the
   * section is a required input, like every other necessary form input.
   */
  related: relatedProductsSchema,
  sortOrder: sortOrderSchema,
  /** ProductCategory.id */
  categoryId: idSchema,
  /** Nullable: "no designer" is a real state (the FK is SetNull). */
  designerId: idSchema.nullable(),
  /** Self-referencing rows: the url/alt pair mirrors `related` entries. */
  images: z.array(productImageSchema),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
