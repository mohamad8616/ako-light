/**
 * Media service — the coordination layer between the storage provider and the
 * database.
 *
 * The reason this module exists, rather than letting callers touch Blob and
 * Prisma themselves, is the consistency problem: an upload is TWO operations
 * against TWO systems that cannot be committed together. Every ordering and
 * failure path below is chosen so the system can only ever fail into a
 * recoverable state:
 *
 *   upload   Blob first, then DB. If the DB write fails, the object that was
 *            just stored is deleted — so a failed upload cannot leak a file.
 *   delete   DB first, then Blob. If the object delete fails, the row is
 *            already gone — leaving a harmless orphan FILE rather than a row
 *            pointing at a file that no longer exists.
 *
 * No distributed-transaction machinery is involved, on purpose: a compensating
 * action on the single failure path (plus an idempotent, best-effort delete) is
 * enough, and it is far easier to reason about than a saga.
 *
 * SERVER-ONLY. It reaches the Prisma client and the storage credentials.
 */
import { Prisma } from "@/generated/prisma/client";
import { getStorageProvider } from "@/lib/media/storage";
import { StorageNotConfiguredError, type StoredObject } from "@/lib/media/types";
import {
  buildStorageKey,
  validateImageUpload,
  type MediaValidationCode,
} from "@/lib/media/validation";
import {
  createMedia,
  deleteMedia,
  updateMediaMetadata,
  type MediaRow,
  type UpdateMediaMetadataInput,
} from "@/lib/repositories/media";

/**
 * Every way a media operation can fail, as a machine-readable code.
 *
 * Validation codes are reused verbatim from the shared validator, so the
 * existing `admin.error.*` dictionary already has copy for them. The
 * `storage*` codes are new and are surfaced as the generic failure by the
 * action layer — the real cause is only knowable server-side, so it is logged.
 */
export type MediaErrorCode =
  | MediaValidationCode
  | "notFound"
  | "storageNotConfigured"
  | "storageFailed";

/** A media operation failure carrying a stable, translatable code. */
export class MediaError extends Error {
  readonly code: MediaErrorCode;

  constructor(code: MediaErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = "MediaError";
    this.code = code;
  }
}

export interface UploadMediaInput {
  /** Original client filename — stored for display/download, never used as a path. */
  filename: string;
  /** The client's `File.type`. Only a cheap filter; the bytes decide. */
  declaredMimeType: string;
  /** The file's bytes. */
  bytes: ArrayBuffer;
  /** Key group ("products", "designers", …). Anything unsafe falls back. */
  folder?: string;
  alt?: string | null;
  title?: string | null;
}

/**
 * Validates, stores, and registers one image.
 *
 * Returns the created row — the caller gets the authoritative URL and key from
 * the database rather than from the intermediate storage result.
 *
 * Throws {@link MediaError} for validation and storage problems, and the
 * underlying database error for a persistence failure (so the action layer's
 * existing `toActionResult` mapping still applies, e.g. a unique-key clash).
 */
export async function uploadMedia(input: UploadMediaInput): Promise<MediaRow> {
  const validated = validateImageUpload(input);
  if (!validated.ok) {
    throw new MediaError(validated.code, `Media upload rejected: ${validated.code}`);
  }

  const { mimeType, extension, size, baseName } = validated.value;
  const key = buildStorageKey({
    folder: input.folder,
    baseName,
    extension,
  });

  let stored: StoredObject;
  try {
    stored = await getStorageProvider().upload({
      key,
      bytes: input.bytes,
      contentType: mimeType,
      // Two admins uploading "hero.png" must not collide, and the provider's
      // suffix is what guarantees it — so the stored key is read back, not
      // assumed.
      addRandomSuffix: true,
    });
  } catch (error) {
    // Nothing was persisted yet, so there is no orphan to clean up.
    // A missing credential is reported distinctly from a transport failure.
    if (error instanceof StorageNotConfiguredError) {
      console.error("[media] storage provider is not configured");
      throw new MediaError("storageNotConfigured", undefined, { cause: error });
    }
    console.error("[media] storage upload failed", error);
    throw new MediaError("storageFailed", undefined, { cause: error });
  }

  try {
    return await createMedia({
      filename: input.filename,
      storageKey: stored.key,
      url: stored.url,
      mimeType,
      size,
      alt: input.alt ?? null,
      title: input.title ?? null,
    });
  } catch (error) {
    // ORPHAN GUARD. The object IS in the store but no row references it. Remove
    // it before rethrowing, otherwise every failed create would leak a file
    // that nothing can ever find again. The cleanup is best-effort: if it also
    // fails we still rethrow the ORIGINAL error, because that is the failure
    // the caller can actually act on.
    await bestEffortDelete([stored.key]);
    throw error;
  }
}

/**
 * Updates editable metadata (alt/title, and the optional probe fields).
 *
 * Pure database work — no storage operation, so there is no cross-system
 * consistency to manage. Throws {@link MediaError} `notFound` for an unknown id.
 */
export async function updateMediaInfo(
  id: string,
  patch: UpdateMediaMetadataInput,
): Promise<MediaRow> {
  try {
    return await updateMediaMetadata(id, patch);
  } catch (error) {
    if (isPrismaNotFound(error)) {
      throw new MediaError("notFound", `Media ${id} not found`, { cause: error });
    }
    throw error;
  }
}

/**
 * Deletes a row and its stored object.
 *
 * ORDER IS LOAD-BEARING — see the module header. The row goes first; the object
 * is removed afterwards on a best-effort basis, so a storage failure leaves an
 * orphan file rather than a row pointing at nothing.
 *
 * Throws {@link MediaError} `notFound` when the id does not exist (and in that
 * case touches neither the store nor any other row).
 */
export async function removeMedia(id: string): Promise<void> {
  let removed: MediaRow;
  try {
    removed = await deleteMedia(id);
  } catch (error) {
    if (isPrismaNotFound(error)) {
      throw new MediaError("notFound", `Media ${id} not found`, { cause: error });
    }
    throw error;
  }

  await bestEffortDelete([removed.storageKey]);
}

/**
 * Deletes objects without ever failing the caller.
 *
 * Mirrors the policy already established for the admin upload cleanup
 * (lib/admin/blob.ts): an orphan object is the acceptable outcome, and turning
 * it into a thrown error would report a failure for an operation that, from the
 * database's point of view, already succeeded.
 */
async function bestEffortDelete(keys: readonly string[]): Promise<void> {
  try {
    await getStorageProvider().delete(keys);
  } catch (error) {
    console.warn("[media] storage cleanup failed for", keys, error);
  }
}

/** Prisma's "record required but not found" (P2025). */
function isPrismaNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

// ---------------------------------------------------------------------------
// Reads.
//
// Re-exported so the media module has ONE public entry point: a consumer needs
// `lib/media/service` and nothing else, and cannot accidentally bypass the
// orchestration above by reaching for the repository directly when it wanted a
// storage-aware operation.
// ---------------------------------------------------------------------------
export {
  countMedia,
  DEFAULT_MEDIA_PAGE_SIZE,
  getMedia,
  getMediaByStorageKey,
  listMedia,
} from "@/lib/repositories/media";
export type {
  ListMediaOptions,
  MediaRow,
  UpdateMediaMetadataInput,
} from "@/lib/repositories/media";
