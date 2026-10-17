import { z } from "zod";
import {
  hexColorSchema,
  imageRefSchema,
  localizedSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

export const materialItemFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  categoryId: z.string().min(1).max(200),
  image: imageRefSchema,
  code: nameSchema.or(z.literal("")),
  swatchColor: hexColorSchema.or(z.literal("")),
  sortOrder: sortOrderSchema,
});

export type MaterialItemFormValues = z.infer<typeof materialItemFormSchema>;
