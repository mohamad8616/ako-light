"use client";

import { upload } from "@vercel/blob/client";

/**
 * The BROWSER half of the direct-upload path (Pass 13.5E).
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT A CONTRADICTION
 *
 * `lib/media/storage/vercel-blob.ts` is the only SERVER module that may import
 * `@vercel/blob`. A direct upload cannot honour that rule in the same way: the
 * bytes travel from the browser straight to the provider, so the browser must
 * run provider-specific code. There is no way to abstract that away without
 * either proxying the file (which is the thing this pass exists to avoid) or
 * inventing a fake neutral protocol.
 *
 * So the rule becomes: **one server module and one client module**, and this is
 * the client one. Nothing else in the app imports `@vercel/blob/client`. Moving
 * to a different provider means implementing its client adapter here and its
 * server provider in `vercel-blob.ts` — two files, not a search-and-replace.
 *
 * The read-write token never reaches this file: the browser only ever receives
 * a short-lived token scoped to a single pathname, minted by the route handler.
 */

/** The route that mints client tokens. Authorised server-side, every call. */
export const DIRECT_UPLOAD_ENDPOINT = "/api/admin/media/upload";

export interface DirectUploadInput {
  /** Provider-relative key, already sanitized by the caller. */
  key: string;
  file: File;
  /** 0–100, called as the transfer progresses. */
  onProgress?: (percentage: number) => void;
}

export interface DirectUploadResult {
  url: string;
  /** The key ACTUALLY written — differs from the request when a suffix is added. */
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * Uploads one file straight to the storage provider.
 *
 * Throws on failure; the caller decides how to report it. Progress is reported
 * through the provider's own callback so the admin sees real transfer
 * percentage rather than an indeterminate spinner — the whole reason the large
 * path exists.
 */
export async function uploadDirectToStorage({
  key,
  file,
  onProgress,
}: DirectUploadInput): Promise<DirectUploadResult> {
  const blob = await upload(key, file, {
    access: "public",
    handleUploadUrl: DIRECT_UPLOAD_ENDPOINT,
    onUploadProgress: (event) => onProgress?.(event.percentage),
  });

  return {
    url: blob.url,
    // `pathname` is the key actually used; with `addRandomSuffix` it is NOT the
    // requested key, which is exactly why the caller persists this value.
    pathname: blob.pathname,
    contentType: blob.contentType,
    size: file.size,
  };
}
