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
import {
  StorageNotConfiguredError,
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

    const blob = await put(key, bytes, {
      access: "public",
      // The sniffed type, not the client's claim — the bytes were already
      // verified against this type before reaching the provider.
      contentType,
      addRandomSuffix,
      token,
    });

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

  getUrl(): string | null {
    // Vercel Blob serves each store from its own hostname, and a pathname alone
    // does not identify the store — so there is nothing to derive a URL from.
    // The authoritative URL is the one `put` returned, persisted as
    // `Media.url`. Returning a guessed host here would be worse than null.
    return null;
  },
};
