import { z } from "zod";
import { imageRefSchema, localizedSchema, slugSchema, sortOrderSchema } from "./common";

/**
 * A material item needs exactly what a customer sees: a bilingual name, the
 * group it belongs to (by the group's stable id), and a photo.
 */
export const materialItemFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  categoryId: z.string().min(1).max(200),
  image: imageRefSchema,
  sortOrder: sortOrderSchema,
});

export type MaterialItemFormValues = z.infer<typeof materialItemFormSchema>;
