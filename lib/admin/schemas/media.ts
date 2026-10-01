import { z } from "zod";
import { TEXT_MAX } from "./common";

/**
 * The media metadata form's rules (mirrors `UpdateMediaMetadataInput`).
 *
 * Only the HUMAN-EDITABLE fields live here. Storage-backed columns
 * (`storageKey`, `url`, `mimeType`, `size`) are deliberately absent: they
 * describe the object in the store, and a form must never be able to redefine
 * them — that would desynchronize the row from the file it points at.
 *
 * Length caps come from `common.ts` like every other admin schema, so the
 * "how long may this be?" answer stays in one place. The cap is a generous
 * ceiling, not a content rule (see the note in common.ts).
 */

/**
 * A metadata field that can be set, cleared, or submitted blank.
 *
 * The column is nullable, so "no alt text" has exactly one representation:
 * `null`. A blank input is therefore normalised to `null` rather than persisted
 * as `""`, which would be a second, indistinguishable way of saying the same
 * thing. An absent field is still a validation error (`invalid_type` →
 * `required`) — the form always submits both fields, so a missing one means a
 * malformed request, not a partial update.
 */
const clearableTextSchema = z
  .string()
  .max(TEXT_MAX)
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const mediaMetadataFormSchema = z.object({
  /** Accessibility alt text. */
  alt: clearableTextSchema,
  /** Admin-facing label. */
  title: clearableTextSchema,
});

/** What a caller submits — blank strings not yet normalised. */
export type MediaMetadataFormInput = z.input<typeof mediaMetadataFormSchema>;

/** What the service receives — blank strings already collapsed to `null`. */
export type MediaMetadataFormValues = z.output<typeof mediaMetadataFormSchema>;
