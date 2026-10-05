/**
 * Vercel Blob implementation of the storage abstraction (lib/media/types.ts).
 *
 * THIS IS THE ONLY MODULE IN THE APP THAT MAY IMPORT `@vercel/blob`. It holds
 * the secret `BLOB_READ_WRITE_TOKEN`, so it is SERVER-ONLY and must never be
 * reached from a client component (same rule as lib/admin/blob.ts).
 *
 * It is NOT an S3 client and must not be presented as one: Vercel Blob is its
 * own API. The abstraction above exists precisely so that fact stays contained
 * here.
 */
import { del, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { BLOB_ACCESS, type BlobAccess } from "@/lib/media/limits";
import {
  StorageAccessMismatchError,
  StorageNotConfiguredError,
  type ClientUploadConstraints,
  type StorageProvider,
  type StoredObject,
  type UploadObjectInput,
} from "@/lib/media/types";

/** The only environment variable this provider reads. Never hardcode a token. */
export const BLOB_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";

/**
 * The token's presence is the configuration check. Read through a function so a
 * caller (and a test) can reason about configuration without importing the SDK.
 */
export function readBlobToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = env[BLOB_TOKEN_ENV];
  return token && token.trim().length > 0 ? token : undefined;
}

/** True when this environment has a Blob token configured. */
export function isBlobConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readBlobToken(env) !== undefined;
}

/**
 * Recognises the provider's access-visibility refusal and re-throws it as the
 * dedicated {@link StorageAccessMismatchError}, so callers can tell a
 * misconfigured store apart from a transport failure.
 *
 * Vercel answers a mismatched write with HTTP 400 and a message naming both
 * sides ("Cannot use public access on a private store. The store is configured
 * with private access."). Matching on the stable phrase — not the status code,
 * which other 400s share — keeps this from swallowing a legitimate bad request.
 */
function rethrowAccessMismatch(error: unknown, expectedAccess: BlobAccess): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/private store|public access on a private|private access on a public/i.test(message)) {
    throw new StorageAccessMismatchError(expectedAccess, {
      storeMessage: message,
      cause: error,
    });
  }
  throw error;
}

export const vercelBlobStorage: StorageProvider = {
  name: "vercel-blob",

  async upload({
    key,
    bytes,
    contentType,
    addRandomSuffix = true,
  }: UploadObjectInput): Promise<StoredObject> {
    const token = readBlobToken();
    if (!token) throw new StorageNotConfiguredError();

    const access = BLOB_ACCESS;

    let blob;
    try {
      blob = await put(key, bytes, {
        access,
        // The sniffed type, not the client's claim — the bytes were already
        // verified against this type before reaching the provider.
        contentType,
        addRandomSuffix,
        token,
      });
    } catch (error) {
      // A store whose visibility does not match `BLOB_ACCESS` is a
      // CONFIGURATION fault, not a transport one — surface it as such so the
      // admin gets actionable copy instead of the generic failure.
      rethrowAccessMismatch(error, access);
    }

    // `blob.pathname` is the key actually written. With `addRandomSuffix` it is
    // NOT the requested key, which is exactly why the caller persists this
    // value rather than the one it asked for.
    return { key: blob.pathname, url: blob.url };
  },

  async delete(keys: readonly string[]): Promise<void> {
    const token = readBlobToken();
    if (!token) throw new StorageNotConfiguredError();

    const targets = [...new Set(keys)].filter((key) => key.length > 0);
    if (targets.length === 0) return;

    // Blob accepts pathnames or full URLs. It rejects the WHOLE batch if any
    // entry is unknown, so callers treat a throw here as best-effort (see
    // lib/media/service.ts) rather than as a failed operation.
    await del(targets, { token });
  },

  supportsClientUpload: true,

  /**
   * Issues a short-lived client token so the BROWSER can write to Blob directly.
   *
   * This is the whole point of Pass 13.5E: a 200 MB video must never be
   * buffered by the Next server, which is what a Server Action upload would do.
   * `handleUpload` mints a token scoped to ONE pathname, with the content types
   * and the byte ceiling baked in — so the provider itself enforces the limits
   * on the wire, and nothing the browser claims afterwards can widen them.
   *
   * The read-write token is read here and never leaves this module: the response
   * carries only the scoped client token.
   *
   * `onUploadCompleted` is intentionally a no-op. The Media row is created by an
   * authorised server action once the browser reports success, because Vercel
   * only invokes this callback from a PUBLICLY REACHABLE deployment — it never
   * fires on localhost, so relying on it would mean the feature silently does
   * nothing in development. Registering in both places would create duplicate
   * rows; the orphan sweeper (scripts/media-orphans.ts) covers the gap this
   * leaves.
   */
  async authorizeClientUpload({
    body,
    request,
    constraints,
  }: {
    body: unknown;
    request: Request;
    constraints: ClientUploadConstraints;
  }): Promise<unknown> {
    const token = readBlobToken();
    if (!token) throw new StorageNotConfiguredError();

    let result: unknown;
    try {
      result = await handleUpload({
        body: body as Parameters<typeof handleUpload>[0]["body"],
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...constraints.allowedContentTypes],
          maximumSizeInBytes: constraints.maximumSizeInBytes,
          addRandomSuffix: true,
          // The visibility the browser will write with. The client sends this
          // as the `x-vercel-blob-access` header on its PUT, derived from the
          // same shared constant, so the token and the write cannot disagree.
          access: BLOB_ACCESS,
          token,
        }),
        onUploadCompleted: async () => {
          // See the note above: registration is client-triggered so that local
          // development behaves exactly like production.
        },
      });
    } catch (error) {
      // Minting itself rarely fails on access mode, but the SDK surfaces an
      // invalid store/token here too — normalise the mismatch if it appears so
      // the route answers with the actionable code rather than a 500.
      rethrowAccessMismatch(error, BLOB_ACCESS);
    }

    return result;
  },

  getUrl(): string | null {
    // Vercel Blob serves each store from its own hostname, and a pathname alone
    // does not identify the store — so there is nothing to derive a URL from.
    // The authoritative URL is the one `put` returned, persisted as
    // `Media.url`. Returning a guessed host here would be worse than null.
    return null;
  },
};
