/**
 * Liara Object Storage configuration.
 *
 * It reads `LIARA_SECRET_KEY`, so it is SERVER-ONLY and must never be reached
 * from a client component (the same rule lib/media/storage/vercel-blob.ts and
 * lib/admin/blob.ts follow).
 */

import { StorageNotConfiguredError } from "@/lib/media/types";

export const LIARA_ENV_NAMES = [
  "LIARA_ENDPOINT",
  "LIARA_BUCKET_NAME",
  "LIARA_ACCESS_KEY",
  "LIARA_SECRET_KEY",
] as const;

export interface LiaraConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function readLiaraConfig(
  env: NodeJS.ProcessEnv = process.env,
): LiaraConfig {
  const [endpoint, bucket, accessKeyId, secretAccessKey] = LIARA_ENV_NAMES.map(
    (name) => env[name]?.trim(),
  );
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
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}
