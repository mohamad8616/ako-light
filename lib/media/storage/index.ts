/**
 * Storage provider selection — the single swap point for the whole app.
 *
 * Nothing outside lib/media/storage/ imports a provider SDK, and nothing outside
 * this file decides WHICH provider is in use. Adding a provider is therefore:
 * implement `StorageProvider`, register it below, point
 * `DEFAULT_STORAGE_PROVIDER` at it. No caller changes.
 */
import { vercelBlobStorage } from "@/lib/media/storage/vercel-blob";
import type { StorageProvider } from "@/lib/media/types";

/** The provider the app uses today. */
export const DEFAULT_STORAGE_PROVIDER = "vercel-blob";

/** Registered providers, keyed by their `StorageProvider.name`. */
const PROVIDERS: Readonly<Record<string, StorageProvider>> = {
  [vercelBlobStorage.name]: vercelBlobStorage,
};

/**
 * The storage provider the media service should use.
 *
 * Throws rather than returning a fallback: a missing registration is a coding
 * error, and silently picking another provider would write objects somewhere
 * nobody is looking.
 */
export function getStorageProvider(
  name: string = DEFAULT_STORAGE_PROVIDER,
): StorageProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `No storage provider registered as "${name}". Registered: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return provider;
}

export {
  BLOB_TOKEN_ENV,
  isBlobConfigured,
  readBlobToken,
  vercelBlobStorage,
} from "@/lib/media/storage/vercel-blob";
export { StorageNotConfiguredError } from "@/lib/media/types";
