import { z } from "zod";
import {
  ID_MAX,
  idSchema,
  imageRefSchema,
  linkSchema,
  localizedSchema,
  nameSchema,
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
  price: z.number().min(0),
  existsInStore: z.boolean(),
  quantity: z.number().int().min(0),
  description: localizedSchema,
  /** SQL NULL when the product has no extra info block. */
  moreInfo: localizedSchema.nullable(),
  downloads: z.array(z.object({ label: localizedSchema, href: linkSchema })),
  related: z.array(
    z.object({
      name: localizedSchema,
      slug: slugSchema,
      /** The related product's category slug. */
      category: slugSchema,
      image: imageRefSchema,
    }),
  ),
  sortOrder: sortOrderSchema,
  /** ProductCategory.id */
  categoryId: idSchema,
  /** Nullable: "no designer" is a real state (the FK is SetNull). */
  designerId: idSchema.nullable(),
  /** Self-referencing rows: the url/alt pair mirrors `related` entries. */
  images: z.array(productImageSchema),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
