import { z } from "zod";
import { TEXT_MAX, URL_MAX } from "./common";

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

/**
 * What the browser reports after a DIRECT upload (Pass 13.5E).
 *
 * Shape only. The authoritative checks — that the key is inside our namespace,
 * that its extension maps to a supported kind, and that the size fits that
 * kind's ceiling — are re-derived server-side in `registerUploadedMedia`, and
 * the upload token is re-verified there, because none of these values can be
 * trusted just because they validated.
 *
 * `uploadToken` is REQUIRED. The server signed it, so it is the only proof that
 * this upload was authorised. The `url`/`pathname` fields that used to be
 * accepted alongside it belonged to the Vercel Blob flow and are gone: Liara
 * derives the public URL from the bucket and the key, so there is nothing for
 * the browser to report and nothing for the server to take on trust.
 */
export const directUploadRegistrationSchema = z.object({
  filename: z.string().min(1).max(TEXT_MAX),
  /** Server-signed authorization for this upload. */
  uploadToken: z.string().min(1).max(URL_MAX),
  size: z.number().int().positive(),
});

export type DirectUploadRegistrationInput = z.infer<
  typeof directUploadRegistrationSchema
>;

/** What a caller submits — blank strings not yet normalised. */
export type MediaMetadataFormInput = z.input<typeof mediaMetadataFormSchema>;

/** What the service receives — blank strings already collapsed to `null`. */
export type MediaMetadataFormValues = z.output<typeof mediaMetadataFormSchema>;
