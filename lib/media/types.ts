/**
 * Media storage abstraction — the provider-agnostic contract.
 *
 * The whole point of this module is that the application NEVER talks to a
 * storage provider's SDK directly. Every import of `@vercel/blob` lives behind
 * lib/media/storage/vercel-blob.ts; the rest of the app depends only on the
 * `StorageProvider` interface below. Replacing the provider (for example with an
 * Iranian object store) is then a change to ONE module, not a search-and-replace
 * across the codebase.
 *
 * Deliberately NOT an S3-shaped interface. Vercel Blob is not S3-compatible,
 * and pretending otherwise would leak S3 assumptions (buckets, regions,
 * presigned multipart URLs) into every caller. The three operations below are
 * the only things the media service actually needs.
 *
 * Bytes, not streams: the upload path validates the file's leading bytes before
 * storing it, so the payload is already fully buffered. Streaming and
 * direct-to-provider uploads belong to the later large-video pass.
 */

/** One object to store. `key` is a provider-relative pathname, already safe. */
export interface UploadObjectInput {
  /**
   * Provider-relative key (pathname). Callers must pass an already-sanitized
   * value — see `buildStorageKey` in lib/media/validation.ts.
   */
  key: string;
  /** The file's bytes. */
  bytes: ArrayBuffer;
  /**
   * The AUTHORITATIVE content type — sniffed from the bytes, never the
   * client-supplied `File.type` claim.
   */
  contentType: string;
  /**
   * Ask the provider to disambiguate the key. When true the stored key differs
   * from the requested one (Vercel Blob appends a random suffix), so callers
   * must persist `StoredObject.key`, never the input key.
   */
  addRandomSuffix?: boolean;
}

/** What a provider hands back after storing an object. */
export interface StoredObject {
  /**
   * The key ACTUALLY used. Differs from the requested key whenever a random
   * suffix was added — always persist this, not the requested key.
   */
  key: string;
  /** The public URL the object is served from, captured at upload time. */
  url: string;
}

/**
 * The storage contract every provider implements.
 *
 * Implementations are SERVER-ONLY (they hold credentials) and must never be
 * imported from a client component.
 */
export interface StorageProvider {
  /** Stable identifier ("vercel-blob") — for logs and diagnostics. */
  readonly name: string;

  /** Stores one object and returns its key + public URL. Throws on failure. */
  upload(input: UploadObjectInput): Promise<StoredObject>;

  /**
   * Removes the objects at `keys`.
   *
   * Must tolerate keys that no longer exist (a retried cleanup, an object
   * deleted by hand in the provider dashboard). Callers treat this as
   * BEST-EFFORT — see `removeMedia` in lib/media/service.ts for why a failure
   * here is logged rather than surfaced.
   */
  delete(keys: readonly string[]): Promise<void>;

  /**
   * The public URL for an object whose key is known, when the provider can
   * derive one WITHOUT a network call or a stored record — or `null` when it
   * cannot.
   *
   * Vercel Blob CANNOT: each store is served from its own hostname, and a
   * pathname alone does not identify the store, so it returns `null`. Callers
   * must then use the URL captured at upload time (`Media.url`).
   *
   * The method stays part of the contract because a provider with a fixed
   * public base (a bucket behind one CDN host, say) CAN answer it — and having
   * it here is what keeps that assumption out of every caller.
   */
  getUrl(key: string): string | null;
}

/**
 * Thrown by a provider when it has no credentials for this environment.
 *
 * Provider-agnostic on purpose: the service maps it to its own
 * `storageNotConfigured` code without knowing WHICH provider is configured.
 */
export class StorageNotConfiguredError extends Error {
  constructor(message = "The storage provider is not configured.") {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}
