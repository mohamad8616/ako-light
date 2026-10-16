"use client";

import {
  authorizeCatalogueDocumentUploadAction,
  registerCatalogueDocumentUploadAction,
  uploadCatalogueDocumentAction,
} from "@/lib/admin/actions/upload";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_SERVER_MAX_BYTES,
  documentMimeForExtension,
} from "@/lib/media/document-sniff";

/** What a successful document upload returns to the form. */
export type CatalogueDocumentUpload = {
  url: string;
  name: string;
  extension: string;
};

/** A structured failure the field can translate through admin.error.*. */
export type CatalogueDocumentUploadFailure = { ok: false; code: string };

export type CatalogueDocumentUploadOutcome =
  | ({ ok: true } & CatalogueDocumentUpload)
  | CatalogueDocumentUploadFailure;

/** Which part of the direct-upload flow is currently running. */
export type CatalogueDocumentUploadPhase = "uploading" | "saving";

function fileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * PUT bytes to a presigned URL while reporting real transfer progress.
 *
 * `fetch` has no portable upload-progress event; XHR still provides one in every
 * supported browser. The URL is short-lived and scoped to one server-generated
 * key, and the only header is the content type the server signed.
 */
function putFile(
  url: string,
  contentType: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", contentType);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress?.((event.loaded / event.total) * 100);
    };
    request.onerror = () => reject(new Error("Storage upload failed."));
    request.onabort = () => reject(new Error("Storage upload was cancelled."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${request.status}).`));
    };
    request.send(file);
  });
}

/**
 * Upload one PDF/PPTX for a catalogue card.
 *
 * Files up to 4 MiB go through an authorized Server Action. Larger files go
 * directly to Liara using a short-lived server-issued PUT URL; a second action
 * then checks the signed token, provider HEAD metadata, and the actual bytes
 * before reporting success. The ceiling is checked in the browser for UX only;
 * both server paths independently enforce it.
 */
export async function uploadCatalogueDocumentFile(
  file: File,
  options: {
    onProgress?: (percent: number) => void;
    onPhase?: (phase: CatalogueDocumentUploadPhase) => void;
  } = {},
): Promise<CatalogueDocumentUploadOutcome> {
  const extension = fileExtension(file.name);
  const expectedMime = documentMimeForExtension(extension);
  if (!expectedMime) return { ok: false, code: "unsupportedType" };
  if (file.size <= 0) return { ok: false, code: "required" };
  if (file.size > DOCUMENT_MAX_BYTES) {
    return { ok: false, code: "documentTooLarge" };
  }

  try {
    if (file.size <= DOCUMENT_SERVER_MAX_BYTES) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadCatalogueDocumentAction(formData);
      if (!result.ok) {
        return {
          ok: false,
          code: result.issues[0]?.code ?? result.formError,
        };
      }
      return { ok: true, ...result.data };
    }

    options.onPhase?.("uploading");
    // Authorization is a Server Action now, not a route: it returns data and
    // streams nothing, and it re-authorizes through the same
    // `requireAdminAccess()` + zod path every other admin call uses.
    const authorization = await authorizeCatalogueDocumentUploadAction({
      filename: file.name,
      size: file.size,
    });

    if (!authorization.ok) {
      return {
        ok: false,
        code: authorization.issues[0]?.code ?? authorization.formError,
      };
    }

    const auth = authorization.data;
    if (auth.contentType !== expectedMime || auth.size !== file.size) {
      return { ok: false, code: "unknown" };
    }

    await putFile(auth.url, expectedMime, file, options.onProgress);
    options.onPhase?.("saving");

    const registered = await registerCatalogueDocumentUploadAction({
      filename: file.name,
      reportedSize: file.size,
      uploadToken: auth.uploadToken,
    });
    if (!registered.ok) {
      return {
        ok: false,
        code: registered.issues[0]?.code ?? registered.formError,
      };
    }

    return { ok: true, ...registered.data };
  } catch (error) {
    console.error("[document] catalogue upload failed", error);
    return { ok: false, code: "unknown" };
  }
}

/** Used by the hidden file input; includes both MIME types and extensions. */
export { DOCUMENT_ACCEPT };
