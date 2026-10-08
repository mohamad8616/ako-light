/**
 * Server-signed authorization for one Liara direct upload.
 *
 * It signs with `BETTER_AUTH_SECRET`, so it is SERVER-ONLY and must never be
 * reached from a client component (the same rule lib/admin/storage-cleanup.ts
 * follows).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface LiaraUploadAuthorization {
  key: string;
  filename: string;
  size: number;
  contentType: string;
  expiresAt: number;
  nonce: string;
}

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value)
    throw new Error(
      "BETTER_AUTH_SECRET is required to sign Liara upload authorizations.",
    );
  return value;
}

export function signLiaraUploadAuthorization(
  payload: LiaraUploadAuthorization,
): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyLiaraUploadAuthorization(
  token: string | null | undefined,
): LiaraUploadAuthorization | null {
  // A missing or non-string token is simply NOT a valid authorization. Guarding
  // here keeps callers from having to pre-check, and stops a malformed request
  // from surfacing as a TypeError instead of a clean refusal.
  if (typeof token !== "string" || token.length === 0) return null;

  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length) return null;
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as LiaraUploadAuthorization;
    if (
      !parsed.key ||
      !parsed.filename ||
      !parsed.contentType ||
      !Number.isSafeInteger(parsed.size) ||
      !Number.isFinite(parsed.expiresAt) ||
      typeof parsed.nonce !== "string"
    )
      return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
