"use client";

import { upload } from "@vercel/blob/client";
import { BLOB_ACCESS } from "@/lib/media/limits";

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
 * A direct upload that failed for a reason the ADMIN can act on, as opposed to
 * a transport blip.
 *
 * The browser cannot mint a token or write to the store itself; when either
 * step is refused because the store's visibility does not match the app, the
 * provider answers with a 400 whose body names the mismatch. Re-throwing that
 * as a typed error lets the dialog show the actionable message instead of
 * collapsing it into the generic "unknown error" — which is exactly how this
 * failure stayed invisible before.
 */
export class DirectUploadError extends Error {
  /** "access_mismatch" when the store refused the write's visibility. */
  readonly reason: "access_mismatch" | "unknown";

  constructor(reason: "access_mismatch" | "unknown", message: string) {
    super(message);
    this.name = "DirectUploadError";
    this.reason = reason;
  }
}

/**
 * Recognises a store-visibility refusal in whatever the SDK threw.
 *
 * The client SDK wraps a failed token-mint as a generic `BlobError("Failed to
 * retrieve the client token")` and DROPS the response body, so the mismatch
 * cannot always be read from the message. Two signals are checked, cheapest
 * first:
 *
 *   1. the provider's own wording, which the SDK preserves when the WRITE
 *      itself fails on the wire ("...on a private store...");
 *   2. the SDK's generic mint-failure wording, which — given the token route
 *      only refuses for that reason after authorization and path/type
 *      validation have already passed — is treated as a store fault.
 *
 * Both are best-effort heuristics for a MESSAGE, never a security decision: the
 * authorization and the limits are enforced server-side regardless.
 */
function classifyUploadError(error: unknown): DirectUploadError {
  const message = error instanceof Error ? error.message : String(error);

  if (/private store|public access on a private|private access on a public/i.test(message)) {
    return new DirectUploadError("access_mismatch", message);
  }
  if (/failed to .*retrieve the client token/i.test(message)) {
    return new DirectUploadError(
      "access_mismatch",
      "The storage store refused this upload's access mode.",
    );
  }
  return new DirectUploadError("unknown", message);
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
  let blob;
  try {
    blob = await upload(key, file, {
      // The visibility MUST match both the store and the token minted by the
      // route — see BLOB_ACCESS in lib/media/limits.ts for why this is shared
      // rather than a bare literal. A mismatch is rejected by the provider with
      // a 400 that names the store's actual visibility, which the caller
      // surfaces via DirectUploadError.
      access: BLOB_ACCESS,
      handleUploadUrl: DIRECT_UPLOAD_ENDPOINT,
      onUploadProgress: (event) => onProgress?.(event.percentage),
    });
  } catch (error) {
    // Never let a provider refusal reach the caller as an opaque value: the
    // dialog needs a reason to render actionable copy rather than the generic
    // failure, and this path has no server log of its own.
    throw classifyUploadError(error);
  }

  return {
    url: blob.url,
    // `pathname` is the key actually used; with `addRandomSuffix` it is NOT the
    // requested key, which is exactly why the caller persists this value.
    pathname: blob.pathname,
    contentType: blob.contentType,
    size: file.size,
  };
}
