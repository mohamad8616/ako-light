import { z } from "zod";
import {
  emailSchema,
  imageRefSchema,
  linkSchema,
  localizedSchema,
  mixedLocalizedSchema,
  nameSchema,
  phoneSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The optional detail-page block (`FlagshipDetail` jsonb) — validated as one
 * value, exactly as it is written. `addressLines` is genuinely mixed in the
 * source data (plain strings AND localized pairs), so each entry is either.
 */
export const flagshipDetailSchema = z.object({
  heroImage: imageRefSchema,
  heading: localizedSchema,
  description: localizedSchema,
  info: z.object({
    name: localizedSchema,
    addressLines: z.array(mixedLocalizedSchema),
    hours: z.array(z.object({ label: localizedSchema, value: nameSchema })),
    appointmentNote: localizedSchema,
    phone: phoneSchema,
    email: emailSchema,
  }),
  video: z.object({ thumbnail: imageRefSchema, url: linkSchema }),
  gallery: z.array(imageRefSchema),
});

/** The flagship form's rules (mirrors `FlagshipWriteInput`). */
export const flagshipFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  city: localizedSchema,
  image: imageRefSchema,
  /** SQL NULL when the flagship has no built-out detail page yet. */
  detail: flagshipDetailSchema.nullable(),
  sortOrder: sortOrderSchema,
});

export type FlagshipFormValues = z.infer<typeof flagshipFormSchema>;
