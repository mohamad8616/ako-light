"use client";

/**
 * The BROWSER half of the direct-upload path (Pass 13.5E).
 *
 * A large file must not travel through the Next server, so the browser asks the
 * route for permission and then PUTs the bytes straight to Liara Object Storage
 * using the short-lived presigned URL it gets back.
 *
 * WHY THIS FILE IS PROVIDER-SPECIFIC. A direct upload cannot be made fully
 * provider-agnostic: the bytes travel from the browser to the backend, so the
 * browser has to speak that backend's protocol. What USED to be here was a
 * `GET ?provider` discovery round-trip with two branches (Vercel Blob's client
 * SDK, and Liara's presigned PUT). Both are gone — Liara is the only provider,
 * so there is no longer any way for a misconfigured environment to send an
 * upload to a different backend, and no discovery request to fail.
 *
 * Credentials never reach this file. The browser receives only:
 *   - a presigned PUT URL scoped to ONE server-generated key, and
 *   - an HMAC upload token, which the server re-verifies independently when the
 *     object is registered — the token is NOT proof of payment-like trust, it
 *     is the server's own note of what it authorised.
 */

/** The route that mints the presigned URL. Authorised server-side, every call. */
export const DIRECT_UPLOAD_ENDPOINT = "/api/admin/media/upload";

export interface DirectUploadInput {
  file: File;
  /** 0–100, called as the transfer progresses. */
  onProgress?: (percentage: number) => void;
}

export interface DirectUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  /** Server-signed authorization, re-verified when the Media row is created. */
  uploadToken?: string;
}

/** What the authorization route returns for one direct upload. */
interface UploadAuthorization {
  url: string;
  key: string;
  contentType: string;
  uploadToken?: string;
}

/**
 * Uploads one file straight to Liara Object Storage.
 *
 * Two steps, and the second cannot be skipped: the browser writes the object,
 * then a server action turns it into a `Media` row. An object with no row is
 * invisible to the library and is swept by scripts/media-orphans.ts.
 *
 * Throws on failure; the caller decides how to report it.
 */
export async function uploadDirectToStorage({
  file,
  onProgress,
}: DirectUploadInput): Promise<DirectUploadResult> {
  // Step 1 — authorization. The server picks the key, the content type and the
  // byte ceiling; the browser asserts only the filename and size, which the
  // server re-checks against the extension and the limit.
  const response = await fetch(DIRECT_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payload: { filename: file.name, size: file.size },
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload authorization failed (${response.status}).`);
  }

  const auth = (await response.json()) as UploadAuthorization;

  // Step 2 — the transfer. The presigned URL already carries the signature, so
  // the only header needed is the content type it was signed for.
  const result = await fetch(auth.url, {
    method: "PUT",
    headers: { "content-type": auth.contentType },
    body: file,
  });

  if (!result.ok) {
    throw new Error(`Storage upload failed (${result.status}).`);
  }

  onProgress?.(100);

  return {
    // Liara serves the object from a URL derived from the bucket + key, so the
    // authoritative value is computed server-side at registration; there is no
    // provider response body to read here.
    url: "",
    pathname: auth.key,
    contentType: auth.contentType,
    size: file.size,
    uploadToken: auth.uploadToken,
  };
}
