"use server";

/**
 * Server action for admin image uploads.
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client form is never
 * the authorization — see the bundled data-security guide), then validate,
 * then persist, and map failures into the structured `ActionResult` contract.
 *
 * WHAT CHANGED IN PASS 13.5C (step 14 — consolidate direct Blob usage)
 *
 * This action used to call `put()` from `@vercel/blob` directly, which made it
 * one of only two modules outside `lib/media/storage/` importing the SDK. It
 * now delegates to `uploadMedia` (lib/media/service.ts), so an upload:
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
 *      object — and `deleteBlobUrls` additionally filters media-owned URLs now.
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
import { MediaError, uploadMedia } from "@/lib/media/service";

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
      // The validation codes have their own copy in the admin dictionary; every
      // other failure (missing token, provider outage, DB error) is only
      // knowable server-side, so it collapses to the generic message — exactly
      // as the old action did.
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
