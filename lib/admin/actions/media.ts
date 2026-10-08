"use server";

/**
 * Server actions for the media foundation.
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client is never the
 * authorization), then validate, then persist, mapping failures into the
 * structured `ActionResult`.
 *
 * The authorization here is the ONLY gate on media management. Nothing in
 * lib/media/* checks a role — the service and repository are request-agnostic
 * by design (they cannot call `redirect()`, and testing them would then require
 * faking a session). Every entry point that a client can reach therefore has to
 * re-establish the role itself, which is what this module does.
 *
 * Storage handling is delegated: `removeMedia` already deletes the database row
 * first and the object second on a best-effort basis (see lib/media/service.ts),
 * so these actions do NOT run the catalog-style
 * `deleteStorageUrls(removedUrls(...))` sweep — there is no URL column to diff
 * against, and the service owns the ordering that keeps the two systems
 * consistent.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
  type AdminErrorCode,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  directUploadRegistrationSchema,
  mediaMetadataFormSchema,
  type DirectUploadRegistrationInput,
  type MediaMetadataFormInput,
} from "@/lib/admin/schemas/media";
import {
  listMediaPage,
  MediaError,
  registerUploadedMedia,
  removeMedia,
  updateMediaInfo,
  uploadMedia,
  type MediaErrorCode,
} from "@/lib/media/service";

/** What an upload reports back to the caller. */
export interface MediaUploadResult {
  id: string;
  url: string;
}

/**
 * Maps a media-layer failure onto the admin result contract.
 *
 * The validation, `notFound` and `inUse` codes line up 1:1 with existing
 * `admin.error.*` dictionary keys, so the client renders them with no new copy.
 * `inUse` is the reference guard (see lib/media/service.ts `removeMedia`): it
 * needs its OWN message, because "the item was not found" would be actively
 * misleading about why a delete was refused.
 *
 * The two storage codes have no dictionary entry of their own, on purpose: the
 * real cause (missing Liara credentials, a provider outage) is only actionable
 * server-side, and inventing a user-facing message for it would either leak
 * infrastructure detail or say nothing useful. They collapse to the generic
 * failure — exactly what the legacy image upload action already does.
 */
function mediaErrorToAdminCode(code: MediaErrorCode): AdminErrorCode {
  switch (code) {
    case "required":
    case "tooLarge":
    case "notImage":
    case "unsupportedType":
    case "notFound":
    case "inUse":
      return code;
    case "storageNotConfigured":
    case "storageFailed":
      return "unknown";
  }
}

/**
 * Media failures become structured codes; anything else (a Prisma error from
 * the row write) goes through the shared mapping, so a unique-key clash still
 * reports the same way it does everywhere else.
 */
function toMediaActionResult(error: unknown): ActionResult<never> {
  if (error instanceof MediaError) {
    return actionFail(mediaErrorToAdminCode(error.code));
  }
  return toActionResult(error);
}

/**
 * Uploads one image and registers it as a Media row.
 *
 * Reads the bytes ONCE and lets the service validate them — the sniffed type,
 * not `file.type`, decides whether the payload is stored. `folder` groups keys
 * per entity ("products", "designers", …); the service sanitizes it, so an
 * unsafe value silently falls back rather than reaching a pathname.
 */
export async function uploadMediaAction(
  formData: FormData,
): Promise<ActionResult<MediaUploadResult>> {
  await requireAdminAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionFail("required");
  }

  // Optional metadata carried alongside the file. Validated with the same
  // schema the metadata action uses, so the length caps cannot drift.
  const folder = formData.get("folder");
  const meta = mediaMetadataFormSchema.safeParse({
    alt: formData.get("alt"),
    title: formData.get("title"),
  });
  if (!meta.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(meta.error));
  }

  try {
    const row = await uploadMedia({
      filename: file.name,
      declaredMimeType: file.type,
      bytes: await file.arrayBuffer(),
      folder: typeof folder === "string" ? folder : undefined,
      alt: meta.data.alt,
      title: meta.data.title,
    });
    revalidateCatalog("media", { id: row.id });
    return actionOk({ id: row.id, url: row.url });
  } catch (error) {
    return toMediaActionResult(error);
  }
}

/** One tile in the picker dialog — only what a chooser needs. */
export interface MediaPickerItem {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
  title: string | null;
}

/** Page size for the picker dialog; smaller than the library grid on purpose. */
const PICKER_PAGE_SIZE = 24;

/**
 * Lists media for the reusable picker (Pass 13.5D).
 *
 * Deliberately a thin authorised wrapper over the SAME `listMediaPage` the
 * library grid uses: the picker must never grow its own media query, or the two
 * would drift and the picker would show a different set of files than
 * /admin/media.
 *
 * Search and paging happen in the database, exactly as in the library — the
 * dialog is handed one page, never the whole table.
 */
export async function listMediaForPickerAction(input: {
  search?: string;
  page?: number;
}): Promise<ActionResult<{ items: MediaPickerItem[]; total: number; page: number }>> {
  await requireAdminAccess();

  const page = Math.max(1, Math.floor(input.page ?? 1));
  const search = input.search?.trim() || undefined;

  try {
    const { rows, total } = await listMediaPage({
      search,
      sort: "newest",
      limit: PICKER_PAGE_SIZE,
      offset: (page - 1) * PICKER_PAGE_SIZE,
    });

    return actionOk({
      items: rows.map((row) => ({
        id: row.id,
        url: row.url,
        filename: row.filename,
        alt: row.alt,
        title: row.title,
      })),
      total,
      page,
    });
  } catch (error) {
    return toMediaActionResult(error);
  }
}

/**
 * Registers an object the BROWSER uploaded directly (Pass 13.5E).
 *
 * The second half of the large-file flow: the bytes went straight from the
 * browser to the provider, and this creates the `Media` row that makes the file
 * visible in the library.
 *
 * Authorised independently, like every other entry point — the token that
 * permitted the upload was issued by a different route, so this one cannot
 * assume it. The client's report of url/pathname/size is then re-validated in
 * `registerUploadedMedia`, which derives the kind and MIME from the pathname
 * rather than trusting the browser's `contentType`.
 */
export async function registerDirectUploadAction(
  input: DirectUploadRegistrationInput,
): Promise<ActionResult<MediaUploadResult>> {
  await requireAdminAccess();

  const parsed = directUploadRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const row = await registerUploadedMedia(parsed.data);
    revalidateCatalog("media", { id: row.id });
    return actionOk({ id: row.id, url: row.url });
  } catch (error) {
    return toMediaActionResult(error);
  }
}

/**
 * Updates the editable metadata of an existing row (alt / title).
 *
 * Metadata only — no storage operation, so there is nothing to keep consistent
 * across systems and no object is ever touched.
 */
export async function updateMediaMetadataAction(
  id: string,
  input: MediaMetadataFormInput,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = mediaMetadataFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateMediaInfo(id, parsed.data);
    revalidateCatalog("media", { id });
    return actionOk(undefined);
  } catch (error) {
    return toMediaActionResult(error);
  }
}

/**
 * Deletes a Media row and its stored object.
 *
 * Ordering is the service's job (row first, object second, best-effort) — see
 * the module header. A missing id reports `notFound`; a storage failure while
 * removing the object does NOT surface as an error, because the row is already
 * gone and an orphan object is the acceptable outcome.
 */
export async function destroyMediaAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await removeMedia(id);
    revalidateCatalog("media");
    return actionOk(undefined);
  } catch (error) {
    return toMediaActionResult(error);
  }
}
