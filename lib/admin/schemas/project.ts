import { z } from "zod";
import {
  clearableImageRefSchema,
  clearableLocalizedSchema,
  idSchema,
  imageRefSchema,
  localizedListSchema,
  localizedSchema,
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
   * Credit lines — ALWAYS an EN/FA pair.
   *
   * They used to be `mixedLocalizedSchema` (a plain string OR a pair) with a
   * toggle in the form, because the source data was genuinely mixed. In practice
   * that made the common case — type the credit in both languages — a two-step
   * dance behind a toggle, and a plain string cannot be edited per language at
   * all. The form now shows the pair directly, and the repository widens any
   * legacy plain string into `{ en: s, fa: s }` on read, so the next save
   * persists a real pair (see `creditsAsPairs`).
   *
   * Each half is capped by `TEXT_MAX`, like every other localized field.
   */
  credits: localizedListSchema,
  /**
   * The project gallery — `ImageListField`, so a row the operator has added but
   * not filled yet holds "". The transform drops those AFTER the URL check, so
   * "+ add" then Save is a no-op instead of a validation error, and a genuinely
   * malformed entry is still reported on its own row.
   *
   * An empty list is valid: the gallery renders nothing.
   */
  portfolioImages: z
    .array(imageRefSchema.or(z.literal("")))
    .transform((list) => list.filter((image) => image !== "")),
  /**
   * The two sections that sit UNDER the gallery, each an OVERRIDE.
   *
   * They used to be purely positional: `ProjectTextImageSection` always took
   * `portfolioImages[0]` + `moreDescription[0]`, and `ProjectFullImageSection`
   * `[1]`. So the only way to change either photo was to change the gallery, and
   * the only way to change the text was to edit the shared "more description"
   * list. Each now owns its photo and its copy.
   *
   * Both are clearable: an empty value falls back to that positional default
   * (`resolvePortfolioSections` in the repository), so an untouched form saves
   * nothing and an existing project keeps rendering exactly as it does today —
   * which is why these columns need no backfill.
   */
  textImageUrl: clearableImageRefSchema,
  textImageText: clearableLocalizedSchema,
  fullImageUrl: clearableImageRefSchema,
  fullImageCaption: clearableLocalizedSchema,
  sortOrder: sortOrderSchema,
  /** Product ids in display order; synced with the join table on save. */
  productIds: z.array(idSchema),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
