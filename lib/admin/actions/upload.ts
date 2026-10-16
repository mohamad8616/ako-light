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
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_SERVER_MAX_BYTES,
  documentExtensionFor,
  documentMimeForExtension,
  safeDocumentFilename,
  sniffDocumentType,
} from "@/lib/media/document-sniff";
import { MediaError, uploadMedia } from "@/lib/media/service";
import { isLiaraStorageHost, storageProvider } from "@/lib/media/storage";
import {
  signLiaraUploadAuthorization,
  verifyLiaraUploadAuthorization,
} from "@/lib/media/storage/liara-upload-token";
import { buildStorageKey } from "@/lib/media/validation";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * The storage folder every catalogue document lives under.
 *
 * Deliberately NOT exported: a `"use server"` module may only export async
 * functions, and nothing outside this file needs the value — the client
 * component imports the ACTION, not the folder name.
 */
const CATALOGUE_DOCUMENT_FOLDER = "catalogue";

/**
 * A storage key whose LAST extension is the document's own.
 *
 * `storageProvider.upload({ addRandomSuffix: true })` appends the provider's
 * random suffix to the WHOLE key — after the extension — producing
 * `…/catalogue.pdf-a1b2c3d4`. That shape is not usable here: the public download
 * route derives the response `Content-Type` from the last extension, and the
 * form schema refuses a document URL that does not end in `.pdf`/`.pptx`. So
 * uniqueness is put in the BASE NAME instead (which `buildStorageKey` sanitizes)
 * and the provider suffix is switched off, which keeps the extension last.
 */
function documentStorageKey(name: string, extension: string): string {
  return buildStorageKey({
    folder: CATALOGUE_DOCUMENT_FOLDER,
    baseName: `${name}-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    extension,
  });
}

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
 * Upload one catalogue-card document (PDF or PPTX) through the small-file path.
 *
 * The browser's `accept` hint is not a security rule: the server checks the
 * filename extension, enforces the Server Action buffer ceiling BEFORE reading,
 * then sniffs the actual bytes and requires them to agree with that extension.
 * A document over four MiB uses the direct-upload path below instead.
 */
export async function uploadCatalogueDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ url: string; name: string; extension: string }>> {
  await requireAdminAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionFail("required");
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return actionFail("documentTooLarge");
  }
  if (file.size > DOCUMENT_SERVER_MAX_BYTES) {
    // A legitimate larger document must use the presigned path; never let an
    // accidental caller buffer it through a Server Action.
    return actionFail("documentTooLarge");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = documentMimeForExtension(extension);
  if (!expectedMime) return actionFail("unsupportedType");

  try {
    const bytes = await file.arrayBuffer();
    const mimeType = sniffDocumentType(new Uint8Array(bytes));
    const actualExtension = mimeType ? documentExtensionFor(mimeType) : null;
    if (!mimeType || !actualExtension || actualExtension !== extension) {
      return actionFail("unsupportedType");
    }
    // File.type is only a claim. Reject a non-empty contradictory claim, but
    // accept an empty one because several browsers do not identify .pptx files.
    if (file.type && file.type !== expectedMime) {
      return actionFail("unsupportedType");
    }

    const name = safeDocumentFilename(file.name, actualExtension);
    const stored = await storageProvider.upload({
      key: documentStorageKey(name, actualExtension),
      bytes,
      contentType: mimeType,
      // NOT `addRandomSuffix`: the provider appends its suffix AFTER the
      // extension, which would store `…catalogue.pdf-a1b2c3` — a URL the
      // download route can no longer read a content type from, and which the
      // form schema refuses. `documentStorageKey` puts the uniqueness in the
      // base name instead.
      addRandomSuffix: false,
    });
    return actionOk({ url: stored.url, name, extension: actualExtension });
  } catch (error) {
    console.error("[upload] catalogue document upload failed", error);
    return actionFail("unknown");
  }
}

const authorizeDocumentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
});

/**
 * Authorize one browser → Liara document upload (PDF/PPTX only).
 *
 * This used to be a Route Handler (`/api/admin/document/upload`). It is a
 * Server Action now because it is a pure RPC: it returns data (a short-lived
 * presigned PUT plus an HMAC token) and never streams a body, which is exactly
 * what an action is for — and it removes a hand-rolled authorization +
 * JSON-parsing layer that only had to re-implement what `requireAdminAccess()`
 * and zod already do.
 *
 * Nothing in the request controls the storage key, the content type or the byte
 * ceiling: all three are derived server-side from the filename's extension. The
 * provider enforces them on the wire, and {@link registerCatalogueDocumentUploadAction}
 * re-verifies the signed token and re-sniffs the stored bytes before the URL
 * ever reaches a form.
 */
export async function authorizeCatalogueDocumentUploadAction(input: {
  filename: string;
  size: number;
}): Promise<
  ActionResult<{
    url: string;
    key: string;
    contentType: string;
    uploadToken: string;
    size: number;
  }>
> {
  await requireAdminAccess();

  const parsed = authorizeDocumentUploadSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const { filename, size } = parsed.data;
  // A filename is a NAME, never a path or a header value — and it is echoed
  // back inside the signed token, so control characters are refused outright.
  if (/[\u0000-\u001f\u007f]/.test(filename)) {
    return actionFail("unsupportedType");
  }

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = documentMimeForExtension(extension);
  const allowedExtension = documentExtensionFor(contentType ?? "");
  if (!contentType || !allowedExtension || allowedExtension !== extension) {
    return actionFail("unsupportedType");
  }

  const key = documentStorageKey(
    safeDocumentFilename(filename, allowedExtension),
    allowedExtension,
  );

  try {
    const incoming = await headers();
    const authorized = await storageProvider.authorizeClientUpload!({
      // The provider's own request body is not part of this contract; Liara
      // derives everything from `constraints`.
      body: null,
      // Passed so a provider that verifies an origin/signature can honour it.
      request: new Request("https://internal.invalid/admin/catalogue/document", {
        method: "POST",
        headers: new Headers(incoming),
      }),
      constraints: {
        key,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: DOCUMENT_MAX_BYTES,
      },
    });

    const presignedUrl = (authorized as { url?: unknown } | null)?.url;
    if (typeof presignedUrl !== "string" || presignedUrl.length === 0) {
      console.error("[upload] document authorization returned no url");
      return actionFail("unknown");
    }

    return actionOk({
      url: presignedUrl,
      key,
      contentType,
      size,
      uploadToken: signLiaraUploadAuthorization({
        nonce: randomUUID(),
        key,
        filename,
        size,
        contentType,
        expiresAt: Date.now() + 5 * 60 * 1000,
      }),
    });
  } catch (error) {
    console.error("[upload] document upload authorization failed", error);
    return actionFail("unknown");
  }
}

const registerDocumentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  reportedSize: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
  uploadToken: z.string().min(1).max(4096),
});

/**
 * Finalize a document the browser PUT directly to Liara.
 *
 * The token is the server's signed record of exactly which key, name, type and
 * size it authorized. The provider HEAD-check confirms the stored type and byte
 * length; this action additionally downloads at most the hard 60 MiB ceiling
 * and sniffs the actual bytes before returning a URL to the form. A renamed
 * executable or a DOCX uploaded under a `.pptx` filename therefore fails the
 * final registration check even if it claimed the permitted content type.
 */
export async function registerCatalogueDocumentUploadAction(input: {
  filename: string;
  reportedSize: number;
  uploadToken: string;
}): Promise<ActionResult<{ url: string; name: string; extension: string }>> {
  await requireAdminAccess();

  const parsed = registerDocumentUploadSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const authorization = verifyLiaraUploadAuthorization(parsed.data.uploadToken);
  if (
    !authorization ||
    authorization.filename !== parsed.data.filename ||
    authorization.size !== parsed.data.reportedSize ||
    !authorization.key.startsWith("media/catalogue/")
  ) {
    return actionFail("unsupportedType");
  }

  const extension = parsed.data.filename.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = documentMimeForExtension(extension);
  if (!expectedMime || authorization.contentType !== expectedMime) {
    return actionFail("unsupportedType");
  }

  const expectedExtension = documentExtensionFor(authorization.contentType);
  if (!expectedExtension || expectedExtension !== extension) {
    return actionFail("unsupportedType");
  }

  let stored: { key: string; url: string; size: number; contentType: string };
  try {
    stored = await storageProvider.verifyClientUpload!({
      key: authorization.key,
      contentType: authorization.contentType,
      maximumSizeInBytes: DOCUMENT_MAX_BYTES,
      reportedSize: authorization.size,
    });

    // The provider URL comes from server config and server-issued key; check it
    // again before fetching so this route never acts as an arbitrary URL proxy.
    const hostname = new URL(stored.url).hostname;
    if (!isLiaraStorageHost(hostname)) {
      await storageProvider.delete([stored.key]);
      return actionFail("unsupportedType");
    }

    const response = await fetch(stored.url, {
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok || !response.body) {
      await storageProvider.delete([stored.key]);
      return actionFail("unknown");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== stored.size || bytes.byteLength > DOCUMENT_MAX_BYTES) {
      await storageProvider.delete([stored.key]);
      return actionFail("documentTooLarge");
    }

    const mimeType = sniffDocumentType(bytes);
    const actualExtension = mimeType ? documentExtensionFor(mimeType) : null;
    if (
      !mimeType ||
      !actualExtension ||
      actualExtension !== extension ||
      mimeType !== authorization.contentType
    ) {
      await storageProvider.delete([stored.key]);
      return actionFail("unsupportedType");
    }

    const name = safeDocumentFilename(parsed.data.filename, actualExtension);
    return actionOk({ url: stored.url, name, extension: actualExtension });
  } catch (error) {
    console.error("[upload] catalogue document registration failed", error);
    // A failed registration leaves no catalogue row pointing at this object.
    // Best-effort cleanup avoids a direct-upload orphan where possible.
    if (authorization.key.startsWith("media/catalogue/")) {
      try {
        await storageProvider.delete([authorization.key]);
      } catch (deleteError) {
        console.error("[upload] document cleanup after registration failure failed", deleteError);
      }
    }
    return actionFail("unknown");
  }
}
