import { z } from "zod";
import {
  i18nKeySchema,
  idSchema,
  imageRefSchema,
  localizedSchema,
  localizedListSchema,
  mixedLocalizedSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
  yearSchema,
} from "./common";

/** The project form's rules (mirrors `ProjectWriteInput`). */
export const projectFormSchema = z.object({
  slug: slugSchema,
  /** Translation-key prefix, e.g. "projects.hIstra". */
  i18nKey: i18nKeySchema,
  name: localizedSchema,
  /** A gallery/venue name — bounded short text. */
  location: nameSchema,
  /** The source data uses "2026" — a string, not a number. */
  year: yearSchema,
  image: imageRefSchema,
  description: localizedSchema,
  paragraph: localizedSchema,
  moreDescription: localizedListSchema,
  /**
   * Mixed credit lines. Each entry is capped by `mixedLocalizedSchema`: a plain
   * string by CREDIT_MAX (500), a localized pair by TEXT_MAX (2000) per half —
   * a credit is a line of attribution, never a body of prose.
   */
  credits: z.array(mixedLocalizedSchema),
  portfolioImages: z.array(imageRefSchema),
  sortOrder: sortOrderSchema,
  /** Product ids in display order; synced with the join table on save. */
  productIds: z.array(idSchema),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
