import { z } from "zod";
import { imageRefSchema, localizedSchema, slugSchema, sortOrderSchema } from "./common";

export const materialCategoryFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  image: imageRefSchema,
  sortOrder: sortOrderSchema,
});

export type MaterialCategoryFormValues = z.infer<typeof materialCategoryFormSchema>;
