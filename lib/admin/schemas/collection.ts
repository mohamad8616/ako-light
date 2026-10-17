import { z } from "zod";
import {
  collectionGallerySchema,
  imageRefSchema,
  localizedSchema,
  relatedProductSnapshotSchema,
  slugSchema,
  sortOrderSchema,
  yearSchema,
} from "./common";

/**
 * The collection form's rules (mirrors `CollectionWriteInput`).
 *
 * `description` is the fixed {p1,p2,p3} jsonb block the public page renders —
 * three required localized paragraphs, not a free-form list. `year` stays a
 * string because the source data uses "2026", not a number.
 *
 * `gallery` and `usedProducts` are the two sections the public page used to
 * render statically: the gallery photos (ImageListField, floored at five by
 * `collectionGallerySchema`) and the products used in the collection (the
 * shared `ProductsUsedField` picker, snapshot mode — the same denormalized
 * shape `Product.related` stores).
 */
export const collectionFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  year: yearSchema,
  image: imageRefSchema,
  description: z.object({
    p1: localizedSchema,
    p2: localizedSchema,
    p3: localizedSchema,
  }),
  gallery: collectionGallerySchema,
  usedProducts: z.array(relatedProductSnapshotSchema),
  sortOrder: sortOrderSchema,
});

export type CollectionFormValues = z.infer<typeof collectionFormSchema>;
