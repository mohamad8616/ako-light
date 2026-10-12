/**
 * Liara Object Storage configuration.
 *
 * It reads `LIARA_SECRET_KEY`, so it is SERVER-ONLY and must never be reached
 * from a client component (the same rule lib/admin/storage-cleanup.ts follows).
 */

import { StorageNotConfiguredError } from "@/lib/media/types";

export const LIARA_ENV_NAMES = [
  "LIARA_ENDPOINT",
  "LIARA_BUCKET_NAME",
  "LIARA_ACCESS_KEY",
  "LIARA_SECRET_KEY",
] as const;

/** Optional HTTPS custom domain for public object URLs. */
export const LIARA_PUBLIC_URL = "LIARA_PUBLIC_URL";

export interface LiaraConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

export function readLiaraConfig(
  env: NodeJS.ProcessEnv = process.env,
): LiaraConfig {
  const [endpoint, bucket, accessKeyId, secretAccessKey] = LIARA_ENV_NAMES.map(
    (name) => env[name]?.trim(),
  );
  const publicUrl = env[LIARA_PUBLIC_URL]?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new StorageNotConfiguredError(
      `Liara storage requires ${LIARA_ENV_NAMES.join(", ")}.`,
    );
  }
  try {
    const parsedEndpoint = new URL(endpoint);
    if (
      parsedEndpoint.protocol !== "https:" &&
      parsedEndpoint.protocol !== "http:"
    )
      throw new Error("unsupported protocol");
  } catch (cause) {
    throw new Error("LIARA_ENDPOINT must be an absolute HTTP(S) URL.", {
      cause,
    });
  }
  let normalizedPublicUrl: string | undefined;
  if (publicUrl) {
    try {
      const parsedPublicUrl = new URL(publicUrl);
      if (parsedPublicUrl.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
      if (
        parsedPublicUrl.pathname !== "/" ||
        parsedPublicUrl.search ||
        parsedPublicUrl.hash
      ) {
        throw new Error("public URL must not include a path, query, or hash");
      }
      normalizedPublicUrl = `${parsedPublicUrl.protocol}//${parsedPublicUrl.host}`;
    } catch (cause) {
      throw new Error(
        "LIARA_PUBLIC_URL must be an HTTPS origin such as https://media.example.com.",
        { cause },
      );
    }
  }

  return {
    endpoint: endpoint.replace(/\/$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
    ...(normalizedPublicUrl ? { publicUrl: normalizedPublicUrl } : {}),
  };
}
