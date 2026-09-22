import { z } from "zod";
import {
  imageRefSchema,
  localizedSchema,
  localizedListSchema,
  mixedLocalizedSchema,
  nonEmptySchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/** The project form's rules (mirrors `ProjectWriteInput`). */
export const projectFormSchema = z.object({
  slug: slugSchema,
  /** Translation-key prefix, e.g. "projects.hIstra". */
  i18nKey: nonEmptySchema,
  name: localizedSchema,
  location: nonEmptySchema,
  /** The source data uses "2026" — a string, not a number. */
  year: z.string().min(1),
  image: imageRefSchema,
  description: localizedSchema,
  paragraph: localizedSchema,
  moreDescription: localizedListSchema,
  credits: z.array(mixedLocalizedSchema),
  portfolioImages: z.array(imageRefSchema),
  sortOrder: sortOrderSchema,
  /** Product ids in display order; synced with the join table on save. */
  productIds: z.array(nonEmptySchema),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
