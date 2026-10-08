/**
 * The app's ONE storage provider.
 *
 * Nothing outside lib/media/storage/ imports a storage SDK, and nothing outside
 * this file decides which backend is in use — so changing backends is a change
 * to this module and the provider beside it, not a search-and-replace across
 * the codebase.
 *
 * Liara Object Storage is the ONLY implementation. The previous design kept a
 * provider registry selected by a `MEDIA_STORAGE_PROVIDER` environment
 * variable, with Vercel Blob as the default. That switch is deliberately gone:
 * when the variable was unset or empty the app fell back to Vercel Blob
 * SILENTLY — no warning, no log, the UI reported success — and every upload
 * landed in the wrong storage. There is now nothing to misconfigure.
 *
 * Callers keep importing from `@/lib/media/storage` and never reach for the
 * provider module directly.
 */
import { liaraStorage } from "@/lib/media/storage/liara";
import type { StorageProvider } from "@/lib/media/types";

/** The provider every media operation goes through. */
export const storageProvider: StorageProvider = liaraStorage;

export {
  createLiaraStorage,
  createLiaraS3Client,
  isLiaraStorageHost,
  LIARA_UPLOAD_URL_TTL_SECONDS,
  liaraPublicUrl,
  liaraStorage,
} from "@/lib/media/storage/liara";
export {
  LIARA_ENV_NAMES,
  readLiaraConfig,
  type LiaraConfig,
} from "@/lib/media/storage/liara-config";
export {
  StorageNotConfiguredError,
  type StorageProvider,
  type StoredObject,
  type UploadObjectInput,
} from "@/lib/media/types";
