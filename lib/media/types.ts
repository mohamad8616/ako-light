/**
 * Media storage abstraction — the contract every provider implements.
 *
 * The point of this module is that the application NEVER talks to a storage SDK
 * directly. The AWS SDK import lives behind lib/media/storage/liara.ts; the rest
 * of the app depends only on the `StorageProvider` interface below, so swapping
 * backends is a change to ONE module rather than a search-and-replace across
 * the codebase.
 *
 * Deliberately NOT an S3-shaped interface, even though the current provider IS
 * S3-compatible: exposing buckets, regions and multipart URLs here would leak
 * one backend's vocabulary into every caller. The operations below are the only
 * things the media service actually needs.
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
   * from the requested one (the Liara provider appends a short random suffix),
   * so callers must persist `StoredObject.key`, never the input key.
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
 * What the server knows about a direct (browser → provider) upload before it
 * authorises one.
 *
 * The constraints are enforced BY THE PROVIDER at upload time, not by the
 * browser afterwards — which is why the client's later report of what it
 * uploaded is not the security boundary.
 */
export interface ClientUploadConstraints {
  /** Provider-relative key the browser will write to. */
  key: string;
  /** The only content types the provider should accept for this upload. */
  allowedContentTypes: readonly string[];
  /** Hard ceiling the provider enforces on the wire. */
  maximumSizeInBytes: number;
}

/**
 * The storage contract every provider implements.
 *
 * Implementations are SERVER-ONLY (they hold credentials) and must never be
 * imported from a client component. The browser half of a direct upload lives
 * in `lib/media/storage/client.ts` — see the note there on why direct uploads
 * cannot be fully provider-agnostic.
 */
export interface StorageProvider {
  /** Stable identifier ("liara") — for logs and diagnostics. */
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
   * The Liara provider CAN: a bucket is served from one fixed public host, so
   * the URL is derived from endpoint + bucket + key with no lookup. Callers may
   * still prefer the URL captured at upload time (`Media.url`), which is what
   * the catalogue stores.
   *
   * Optional on purpose: a provider served from per-store hostnames could not
   * answer it, and returning a guessed host would be worse than `null`.
   */
  getUrl(key: string): string | null;

  /**
   * Whether this provider can accept an upload DIRECT from the browser
   * (Pass 13.5E).
   *
   * Optional on purpose: a provider that cannot do this simply cannot serve
   * large files, and the service reports that honestly instead of routing a
   * 200 MB video through a Server Action that would buffer it in memory.
   */
  readonly supportsClientUpload?: boolean;

  /**
   * Authorises ONE direct upload and returns the provider's own response body.
   *
   * `body` is passed through untouched: it is the provider's client SDK that
   * produced it, and its shape is the provider's business — translating it here
   * would leak the provider's protocol into the abstraction.
   *
   * The implementation MUST re-check authorization and MUST enforce
   * `constraints` on the wire, because the browser is the untrusted half.
   */
  authorizeClientUpload?(input: {
    body: unknown;
    /** The original request, for providers that verify an origin/signature. */
    request: Request;
    constraints: ClientUploadConstraints;
  }): Promise<unknown>;

  /** Verify an uploaded object against server-issued authorization before registration. */
  verifyClientUpload?(input: {
    key: string;
    contentType: string;
    maximumSizeInBytes: number;
    reportedSize?: number;
  }): Promise<{ key: string; url: string; size: number; contentType: string }>;
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
