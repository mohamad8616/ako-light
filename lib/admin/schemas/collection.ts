import { z } from "zod";
import {
  imageRefSchema,
  localizedSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The collection form's rules (mirrors `CollectionWriteInput`).
 *
 * `description` is the fixed {p1,p2,p3} jsonb block the public page renders —
 * three required localized paragraphs, not a free-form list. `year` stays a
 * string because the source data uses "2026", not a number.
 */
export const collectionFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  year: z.string().min(1),
  image: imageRefSchema,
  description: z.object({
    p1: localizedSchema,
    p2: localizedSchema,
    p3: localizedSchema,
  }),
  sortOrder: sortOrderSchema,
});

export type CollectionFormValues = z.infer<typeof collectionFormSchema>;
