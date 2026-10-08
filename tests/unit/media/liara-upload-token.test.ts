/**
 * Server-signed direct-upload authorization (lib/media/storage/liara-upload-token.ts).
 *
 * This token is what makes requirement 13 enforceable: the browser cannot widen
 * the key, the size or the content type after the server has signed them.
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  signLiaraUploadAuthorization,
  verifyLiaraUploadAuthorization,
} from "@/lib/media/storage/liara-upload-token";

const PAYLOAD = {
  nonce: "11111111-1111-1111-1111-111111111111",
  key: "media/library/1-clip.mp4",
  filename: "clip.mp4",
  size: 1024,
  contentType: "video/mp4",
  expiresAt: Date.now() + 60_000,
};

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-for-signing";
});

describe("Liara upload authorization token", () => {
  it("round-trips the authorized key, size and content type", () => {
    const token = signLiaraUploadAuthorization(PAYLOAD);
    expect(verifyLiaraUploadAuthorization(token)).toEqual(PAYLOAD);
  });

  it("rejects a tampered payload (the whole point of signing it)", () => {
    const token = signLiaraUploadAuthorization(PAYLOAD);
    const [encoded, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...PAYLOAD, key: "media/library/evil.mp4", size: 999 }),
    ).toString("base64url");

    expect(verifyLiaraUploadAuthorization(`${forged}.${signature}`)).toBeNull();
    // The original two halves are still valid on their own.
    expect(
      verifyLiaraUploadAuthorization(`${encoded}.${signature}`),
    ).not.toBeNull();
  });

  it("rejects a token that was not produced by this secret", () => {
    const token = signLiaraUploadAuthorization(PAYLOAD);
    process.env.BETTER_AUTH_SECRET = "a-different-secret";
    expect(verifyLiaraUploadAuthorization(token)).toBeNull();
  });

  it("rejects an expired authorization", () => {
    const token = signLiaraUploadAuthorization({
      ...PAYLOAD,
      expiresAt: Date.now() - 1,
    });
    expect(verifyLiaraUploadAuthorization(token)).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    for (const bad of ["", "one-part", "a.b.c", "!!!.???"]) {
      expect(verifyLiaraUploadAuthorization(bad)).toBeNull();
    }
  });

  it("rejects a well-signed payload with a missing field", () => {
    const token = signLiaraUploadAuthorization({
      ...PAYLOAD,
      size: Number.NaN,
    });
    expect(verifyLiaraUploadAuthorization(token)).toBeNull();
  });
});
