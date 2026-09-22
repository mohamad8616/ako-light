import { z } from "zod";
import {
  imageRefSchema,
  linkSchema,
  localizedSchema,
  localizedListSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/** The designer form's rules (mirrors `DesignerWriteInput`). */
export const designerFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  image: imageRefSchema,
  website: linkSchema.nullable(),
  /** Biography paragraphs, one localized pair per entry. */
  bio: localizedListSchema,
  sortOrder: sortOrderSchema,
});

export type DesignerFormValues = z.infer<typeof designerFormSchema>;
