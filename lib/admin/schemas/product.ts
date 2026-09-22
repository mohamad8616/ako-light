import { z } from "zod";
import {
  imageRefSchema,
  linkSchema,
  localizedSchema,
  nonEmptySchema,
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
  id: z.string().min(1).optional(),
  url: imageRefSchema,
  alt: z.string().nullable(),
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
      category: nonEmptySchema,
      image: imageRefSchema,
    }),
  ),
  sortOrder: sortOrderSchema,
  categoryId: nonEmptySchema,
  /** Nullable: "no designer" is a real state (the FK is SetNull). */
  designerId: nonEmptySchema.nullable(),
  images: z.array(productImageSchema),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
