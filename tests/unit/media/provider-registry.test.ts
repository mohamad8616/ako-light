/**
 * Provider registry (lib/media/storage/index.ts).
 *
 * The requirement for this pass is narrow and important: Liara must be a
 * selectable provider WITHOUT becoming the production default, so existing
 * Vercel uploads keep behaving exactly as they do today.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_STORAGE_PROVIDER,
  getStorageProvider,
  STORAGE_PROVIDER_ENV,
} from "@/lib/media/storage";

const original = process.env[STORAGE_PROVIDER_ENV];

afterEach(() => {
  if (original === undefined) delete process.env[STORAGE_PROVIDER_ENV];
  else process.env[STORAGE_PROVIDER_ENV] = original;
});

describe("storage provider registry", () => {
  it("keeps Vercel Blob as the default", () => {
    delete process.env[STORAGE_PROVIDER_ENV];
    expect(DEFAULT_STORAGE_PROVIDER).toBe("vercel-blob");
    expect(getStorageProvider().name).toBe("vercel-blob");
  });

  it("selects Liara explicitly via the environment", () => {
    process.env[STORAGE_PROVIDER_ENV] = "liara";
    expect(getStorageProvider().name).toBe("liara");
  });

  it("exposes the Liara provider contract (upload, delete, url, direct upload)", () => {
    const provider = getStorageProvider("liara");
    expect(typeof provider.upload).toBe("function");
    expect(typeof provider.delete).toBe("function");
    expect(typeof provider.getUrl).toBe("function");
    expect(provider.supportsClientUpload).toBe(true);
    expect(typeof provider.authorizeClientUpload).toBe("function");
    expect(typeof provider.verifyClientUpload).toBe("function");
  });

  it("still exposes the Vercel provider unchanged", () => {
    const provider = getStorageProvider("vercel-blob");
    expect(provider.name).toBe("vercel-blob");
    expect(provider.supportsClientUpload).toBe(true);
  });

  it("throws for an unknown provider rather than falling back silently", () => {
    expect(() => getStorageProvider("nope")).toThrow(
      /No storage provider registered/,
    );
  });
});
