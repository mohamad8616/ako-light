import { z } from "zod";
import {
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

/**
 * The project form's rules (mirrors `ProjectWriteInput`, minus `i18nKey`).
 *
 * `i18nKey` is deliberately NOT here. It is a leftover from when a project's
 * copy lived in the translation dictionary under `projects.<key>.*`; since the
 * copy moved into real columns nothing reads it, and the admin no longer asks
 * for it — the server action derives it. See
 * `lib/admin/actions/projects.ts#withI18nKey`.
 */
export const projectFormSchema = z.object({
  slug: slugSchema,
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
  /**
   * The project gallery — `ImageListField`, so a row the operator has added but
   * not filled yet holds "". The transform drops those AFTER the URL check, so
   * "+ add" then Save is a no-op instead of a validation error, and a genuinely
   * malformed entry is still reported on its own row.
   *
   * An empty list is valid: the gallery renders nothing, and the two
   * portfolio-image sections below it are skipped by the page.
   */
  portfolioImages: z
    .array(imageRefSchema.or(z.literal("")))
    .transform((list) => list.filter((image) => image !== "")),
  sortOrder: sortOrderSchema,
  /** Product ids in display order; synced with the join table on save. */
  productIds: z.array(idSchema),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
