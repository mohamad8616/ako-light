/**
 * Storage provider selection — the single swap point for the whole app.
 *
 * Nothing outside lib/media/storage/ imports a provider SDK, and nothing outside
 * this file decides WHICH provider is in use. Adding a provider is therefore:
 * implement `StorageProvider`, register it below, point
 * `DEFAULT_STORAGE_PROVIDER` at it. No caller changes.
 */
import { liaraStorage } from "@/lib/media/storage/liara";
import { vercelBlobStorage } from "@/lib/media/storage/vercel-blob";
import type { StorageProvider } from "@/lib/media/types";

/** Keep Vercel as default until Liara is configured and production-verified. */
export const DEFAULT_STORAGE_PROVIDER = "vercel-blob";
export const STORAGE_PROVIDER_ENV = "MEDIA_STORAGE_PROVIDER";

/** Registered providers, keyed by their `StorageProvider.name`. */
const PROVIDERS: Readonly<Record<string, StorageProvider>> = {
  [vercelBlobStorage.name]: vercelBlobStorage,
  [liaraStorage.name]: liaraStorage,
};

/**
 * The storage provider the media service should use.
 *
 * Throws rather than returning a fallback: a missing registration is a coding
 * error, and silently picking another provider would write objects somewhere
 * nobody is looking.
 */
export function getStorageProvider(
  name: string = process.env[STORAGE_PROVIDER_ENV] || DEFAULT_STORAGE_PROVIDER,
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
export {
  liaraStorage,
  createLiaraStorage,
  liaraPublicUrl,
} from "@/lib/media/storage/liara";
export {
  readLiaraConfig,
  LIARA_ENV_NAMES,
} from "@/lib/media/storage/liara-config";
export {
  StorageAccessMismatchError,
  StorageNotConfiguredError,
} from "@/lib/media/types";
