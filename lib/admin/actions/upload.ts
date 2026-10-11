"use server";

/**
 * Server action for admin image uploads.
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client form is never
 * the authorization — see the bundled data-security guide), then validate,
 * then persist, and map failures into the structured `ActionResult` contract.
 *
 * WHAT CHANGED IN PASS 13.5C (step 14 — consolidate direct storage usage)
 *
 * This action used to talk to a storage SDK directly, which made it one of only
 * two modules outside `lib/media/storage/` doing so. It now delegates to
 * `uploadMedia` (lib/media/service.ts), so an upload:
 *
 *   - is validated by the SHARED validator (byte sniffing — the declared
 *     `File.type` is still only a claim, never the evidence);
 *   - is stored through the `StorageProvider` abstraction, so swapping the
 *     provider touches one module instead of every action;
 *   - REGISTERS a `Media` row, so the file appears in /admin/media and can be
 *     reused instead of re-uploaded.
 *
 * Two consequences to be aware of:
 *
 *   1. **Keys move from `admin/…` to `media/…`.** The namespaces stay disjoint,
 *      which is what keeps the legacy URL sweep from deleting a media-owned
 *      object — and `deleteStorageUrls` additionally filters media-owned keys now.
 *   2. **Replacing an image no longer deletes the object.** Removing an image
 *      from a product removes the relationship only; the Media row and its file
 *      survive and are deleted from /admin/media, and only once unreferenced.
 *
 * The action still returns just a public URL, because every image column in the
 * admin is a plain URL string — so NO zod schema changes shape and the field
 * component stays a drop-in replacement for the old text inputs.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { actionFail, actionOk, type ActionResult } from "@/lib/admin/result";
import {
  PDF_MAX_BYTES,
  safePdfFilename,
  sniffPdfType,
} from "@/lib/media/pdf-sniff";
import { MediaError, uploadMedia } from "@/lib/media/service";
import { storageProvider } from "@/lib/media/storage";
import { buildStorageKey } from "@/lib/media/validation";

/**
 * The storage folder the catalogue's CTA PDF lives under.
 *
 * Deliberately NOT exported: a `"use server"` module may only export async
 * functions, and nothing outside this file needs the value — the client
 * component imports the ACTION, not the folder name.
 */
const CATALOGUE_PDF_FOLDER = "catalogue";

/**
 * Uploads one image through the media layer and returns its public URL.
 *
 * `folder` groups keys per entity ("products", "designers", …); anything that
 * is not a plain slug falls back inside the service rather than being
 * interpolated into a pathname.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireAdminAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionFail("required");
  }

  const folder = formData.get("folder");

  try {
    // Read once and hand the same bytes to the service: the payload that is
    // validated is exactly the payload that gets stored.
    const row = await uploadMedia({
      filename: file.name,
      declaredMimeType: file.type,
      bytes: await file.arrayBuffer(),
      folder: typeof folder === "string" ? folder : undefined,
    });

    return actionOk({ url: row.url });
  } catch (error) {
    if (error instanceof MediaError) {
      // The validation codes have their own copy in the admin dictionary.
      // Every other failure (missing credentials, provider outage, DB error) is
      // only knowable server-side, so it collapses to the generic message —
      // exactly as the old action did.
      if (
        error.code === "required" ||
        error.code === "tooLarge" ||
        error.code === "notImage"
      ) {
        return actionFail(error.code);
      }
      console.error(`[upload] media upload failed: ${error.code}`, error);
      return actionFail("unknown");
    }

    console.error("[upload] media upload failed", error);
    return actionFail("unknown");
  }
}

/**
 * Uploads the catalogue CTA's PDF (Pass C.4).
 *
 * ── Why this does not go through `uploadMedia` ──────────────────────────────
 *
 * The media library is deliberately IMAGE/VIDEO only: `validateMediaUpload`
 * accepts exactly two kinds, and a `Media` row carries the fields those kinds
 * need (dimensions, a poster). Widening that validator and that table to carry a
 * document would change the media architecture for one field. So a PDF is
 * stored through the SAME `storageProvider` abstraction and the SAME key
 * builder, under its own `catalogue/` folder, and no `Media` row is created —
 * the object is owned by the `CatalogueFeature.ctaPdfUrl` column, and
 * `deleteStorageUrls` already derives its key from the URL for cleanup.
 *
 * ── What is enforced, and in what order ────────────────────────────────────
 *
 * `requireAdminAccess()` FIRST — this is a server function reachable by a
 * direct POST, so the form is never the authorization.
 *
 * Then the size ceiling is checked BEFORE the body is buffered (a cheap
 * `file.size` comparison must not wait on reading megabytes into memory), and
 * the type is decided from the BYTES, never from the client's `File.type`
 * claim. A file that merely names itself `.pdf` is refused.
 */
export async function uploadCataloguePdfAction(
  formData: FormData,
): Promise<ActionResult<{ url: string; name: string }>> {
  await requireAdminAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionFail("required");
  }

  // Cheap checks first: the ceiling and the declared type, before buffering.
  if (file.size > PDF_MAX_BYTES) {
    return actionFail("tooLarge");
  }

  try {
    const bytes = await file.arrayBuffer();

    // The AUTHORITATIVE type — read off the leading bytes, not asserted by the
    // browser. `null` means "not a PDF", whatever the file was called.
    const mimeType = sniffPdfType(new Uint8Array(bytes));
    if (!mimeType) {
      return actionFail("unsupportedType");
    }

    const name = safePdfFilename(file.name);

    const stored = await storageProvider.upload({
      key: buildStorageKey({
        folder: CATALOGUE_PDF_FOLDER,
        baseName: name,
        extension: "pdf",
      }),
      bytes,
      contentType: mimeType,
      // Two admins uploading "catalogue.pdf" must not collide; the provider's
      // suffix is what guarantees it, so the returned key is the one that counts.
      addRandomSuffix: true,
    });

    // Only the URL and a presentable name travel back to the form. The storage
    // KEY stays server-side, exactly as the image upload path does.
    return actionOk({ url: stored.url, name });
  } catch (error) {
    console.error("[upload] catalogue pdf upload failed", error);
    return actionFail("unknown");
  }
}
