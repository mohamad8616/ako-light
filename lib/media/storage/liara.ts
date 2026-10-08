/**
 * Liara Object Storage provider — the S3-compatible implementation of
 * `StorageProvider` (lib/media/types.ts).
 *
 * It holds `LIARA_SECRET_KEY`, so it is SERVER-ONLY and must never be reached
 * from a client component (the same rule lib/media/storage/vercel-blob.ts and
 * lib/admin/blob.ts follow). The browser half of a direct upload lives in
 * lib/media/storage/client.ts.
 *
 * Credentials never leave this module's config: the browser receives only a
 * short-lived presigned URL scoped to one server-generated key.
 */

import {
  readLiaraConfig,
  type LiaraConfig,
} from "@/lib/media/storage/liara-config";
import {
  type StorageProvider,
  type StoredObject,
  type UploadObjectInput,
} from "@/lib/media/types";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const LIARA_UPLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * Domains Liara's storage cluster actually answers on.
 *
 * `liara.ir` is the corporate domain, but the OBJECT STORAGE endpoint lives on
 * `liara.site` / `liara.space`: the value the console shows under
 * «دسترسی با SDK» is `https://storage.iran.liara.site`. Both resolve to the same
 * cluster (185.208.182.248/249/250), while `storage.iran.liara.ir` does NOT
 * resolve at all (ENOTFOUND).
 *
 * Matching only `liara.ir` — as this module used to — therefore never fired for
 * a real deployment, so every Liara upload silently produced a PATH-STYLE
 * public URL instead of the intended bucket-subdomain one.
 */
const LIARA_HOST_SUFFIXES = ["liara.ir", "liara.site", "liara.space"] as const;

/** True when a hostname belongs to Liara's storage cluster. */
export function isLiaraStorageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return LIARA_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function liaraPublicUrl(
  key: string,
  endpoint: string,
  bucket: string,
): string {
  const base = new URL(endpoint);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const port = base.port ? `:${base.port}` : "";
  // Liara serves an object at BOTH shapes — verified against the live cluster:
  // `host/bucket/key` and `bucket.host/key` each answer `404 NoSuchKey` for a
  // missing key, which proves the request reached the right bucket either way.
  // The bucket subdomain is the conventional public form, so it is what we
  // emit; `next.config.ts` must whitelist that host for `<Image>`.
  return isLiaraStorageHost(base.hostname)
    ? `${base.protocol}//${bucket}.${base.hostname}${port}/${encodedKey}`
    : `${base.protocol}//${base.hostname}${port}/${bucket}/${encodedKey}`;
}

export function createLiaraS3Client(config: LiaraConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: "default",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createLiaraStorage(
  deps: {
    config?: () => LiaraConfig;
    client?: (config: LiaraConfig) => S3Client;
    presign?: typeof getSignedUrl;
  } = {},
): StorageProvider {
  const config = deps.config ?? readLiaraConfig;
  const clientFactory = deps.client ?? createLiaraS3Client;
  const presign = deps.presign ?? getSignedUrl;

  return {
    name: "liara",
    supportsClientUpload: true,

    async upload(input: UploadObjectInput): Promise<StoredObject> {
      const settings = config();
      const key = input.addRandomSuffix
        ? `${input.key}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`
        : input.key;
      await clientFactory(settings).send(
        new PutObjectCommand({
          Bucket: settings.bucket,
          Key: key,
          Body: new Uint8Array(input.bytes),
          ContentType: input.contentType,
        }),
      );
      return {
        key,
        url: liaraPublicUrl(key, settings.endpoint, settings.bucket),
      };
    },

    async delete(keys: readonly string[]): Promise<void> {
      const settings = config();
      const client = clientFactory(settings);
      for (const key of [...new Set(keys)].filter(Boolean)) {
        await client.send(
          new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }),
        );
      }
    },

    getUrl(key: string): string | null {
      try {
        const settings = config();
        return liaraPublicUrl(key, settings.endpoint, settings.bucket);
      } catch {
        return null;
      }
    },

    async authorizeClientUpload({ constraints }) {
      if (!constraints.key.startsWith("media/"))
        throw new Error("Liara uploads must use the media/ key prefix.");
      if (constraints.maximumSizeInBytes > 200 * 1024 * 1024)
        throw new Error("Liara direct uploads are capped at 200 MB.");
      const settings = config();
      const contentType = constraints.allowedContentTypes[0];
      if (!contentType)
        throw new Error("A content type must be authorized for this upload.");
      const client = clientFactory(settings);
      const expiresAt = Date.now() + LIARA_UPLOAD_URL_TTL_SECONDS * 1000;
      const command = new PutObjectCommand({
        Bucket: settings.bucket,
        Key: constraints.key,
        ContentType: contentType,
      });
      const url = await presign(client, command, {
        expiresIn: LIARA_UPLOAD_URL_TTL_SECONDS,
      });
      return {
        provider: "liara",
        key: constraints.key,
        url,
        method: "PUT",
        contentType,
        maximumSizeInBytes: constraints.maximumSizeInBytes,
        expiresAt,
      };
    },

    async verifyClientUpload(input) {
      const settings = config();
      const head = await clientFactory(settings).send(
        new HeadObjectCommand({
          Bucket: settings.bucket,
          Key: input.key,
        }),
      );
      if (head.ContentLength === undefined || head.ContentLength <= 0)
        throw new Error("Uploaded object is empty or has no reported size.");
      if (head.ContentLength > input.maximumSizeInBytes)
        throw new Error("Uploaded object exceeds its authorized size limit.");
      if (
        input.reportedSize !== undefined &&
        head.ContentLength !== input.reportedSize
      )
        throw new Error(
          "Uploaded object size does not match the authorization.",
        );
      if (head.ContentType !== input.contentType)
        throw new Error(
          "Uploaded object content type does not match the authorization.",
        );
      return {
        key: input.key,
        url: liaraPublicUrl(input.key, settings.endpoint, settings.bucket),
        size: head.ContentLength,
        contentType: head.ContentType,
      };
    },
  };
}

export const liaraStorage = createLiaraStorage();
