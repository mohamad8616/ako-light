"use server";

/**
 * Server action for admin image uploads (Vercel Blob).
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client form is never
 * the authorization — see the bundled data-security guide), then validate,
 * then persist, and map failures into the structured `ActionResult` contract.
 *
 * VALIDATION IS SERVER-SIDE AND CONTENT-BASED. A browser-supplied
 * `File.type` is a claim, not a fact — anyone can POST a script named
 * "cat.png" with `type: "image/png"`. So the declared MIME is only a cheap
 * first filter; the authoritative check reads the file's leading bytes and
 * requires them to be a real JPEG / PNG / WebP / AVIF signature. A file whose
 * bytes do not match a supported image is rejected no matter what it claims.
 *
 * The action returns only the resulting public URL. Every image column in the
 * admin is already a plain URL string, so the field component is a drop-in
 * replacement for the old text inputs and NO zod schema changes shape.
 */
import { put } from "@vercel/blob";
import { requireAdminAccess } from "@/lib/admin/access";
import {
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  safeBaseName,
  sniffImageType,
} from "@/lib/admin/image-sniff";
import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/result";

/**
 * Blob keys are grouped per entity ("products", "designers", …) so the store
 * stays navigable. The value comes from the client, so it is matched against a
 * strict slug pattern and falls back to a neutral folder — never interpolated
 * raw into a pathname.
 */
const FOLDER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_FOLDER = "uploads";

/**
 * Uploads one image to Vercel Blob and returns its public URL.
 *
 * `folder` groups keys per entity; anything that is not a plain slug silently
 * falls back to `uploads` (defensive: the value crosses a client boundary).
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireAdminAccess();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Surfaced to the admin as the generic failure; the real cause (the store
    // is not connected to this Vercel project / the env is missing) is only
    // knowable server-side, so it goes to the log.
    console.error("[upload] BLOB_READ_WRITE_TOKEN is not set");
    return actionFail("unknown");
  }

  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File) || file.size === 0) {
    return actionFail("required");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return actionFail("tooLarge");
  }
  if (!(file.type in IMAGE_EXTENSIONS)) {
    return actionFail("notImage");
  }

  // Read once: the same buffer is sniffed and then uploaded, so validation
  // and the stored bytes can never diverge.
  const buffer = await file.arrayBuffer();
  // The declared type is a claim; the bytes are the evidence.
  const sniffed = sniffImageType(new Uint8Array(buffer));
  if (!sniffed || !(sniffed in IMAGE_EXTENSIONS)) {
    return actionFail("notImage");
  }

  const group =
    typeof folder === "string" && FOLDER_PATTERN.test(folder)
      ? folder
      : DEFAULT_FOLDER;
  const extension = IMAGE_EXTENSIONS[sniffed];
  const base = safeBaseName(file.name).replace(
    /\.(jpe?g|png|webp|avif)$/,
    "",
  );
  // `addRandomSuffix` keeps two admins uploading "hero.png" from colliding,
  // and the timestamp keeps keys roughly chronological in the store listing.
  const pathname = `admin/${group}/${Date.now()}-${base}.${extension}`;

  try {
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: sniffed,
      addRandomSuffix: true,
    });
    return actionOk({ url: blob.url });
  } catch (error) {
    console.error("[upload] blob put failed", error);
    return actionFail("unknown");
  }
}
