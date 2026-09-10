import { describe, expect, it } from "vitest";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import type { JsonLdObject } from "@/lib/seo/structuredData";

describe("resolveLocale", () => {
  it("passes known locales through", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("fa")).toBe("fa");
  });

  it("falls back to Persian for unknown values", () => {
    expect(resolveLocale("de")).toBe("fa");
    expect(resolveLocale("")).toBe("fa");
  });
});

describe("trimDescription", () => {
  it("keeps short text unchanged", () => {
    expect(trimDescription("Short description.")).toBe("Short description.");
  });

  it("collapses internal whitespace", () => {
    expect(trimDescription("  a   b\n\tc  ")).toBe("a b c");
  });

  it("keeps text at exactly the max length unchanged", () => {
    const text = "a".repeat(160);
    expect(trimDescription(text, 160)).toBe(text);
    expect(trimDescription(text)).toBe(text);
  });

  it("truncates long text at a word boundary with an ellipsis", () => {
    const text = "word ".repeat(50).trim(); // ~249 chars
    const result = trimDescription(text, 60);
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith("…")).toBe(true);
    expect(trimDescription(text, 60)).not.toContain("… ");
  });

  it("handles long text without spaces without crashing", () => {
    const text = "x".repeat(200);
    const result = trimDescription(text, 60);
    expect(result.length).toBe(60);
    expect(result.endsWith("…")).toBe(true);
  });

  it("uses the default max length of 160", () => {
    const text = "y".repeat(300);
    expect(trimDescription(text).length).toBe(160);
    expect(trimDescription(text).endsWith("…")).toBe(true);
  });
});

describe("buildLocalizedMetadata", () => {
  const base = { title: "About Home Form", description: "About page." };

  it("canonicalizes Persian URLs unprefixed", () => {
    const meta = buildLocalizedMetadata({ locale: "fa", path: "/about", ...base });
    expect(meta.alternates?.canonical).toBe("/about");
    expect(meta.alternates?.languages?.["fa-IR"]).toBe("/about");
    expect(meta.alternates?.languages?.["en-US"]).toBe("/en/about");
    expect(meta.alternates?.languages?.["x-default"]).toBe("/about");
  });

  it("canonicalizes English URLs with the /en prefix", () => {
    const meta = buildLocalizedMetadata({ locale: "en", path: "/about", ...base });
    expect(meta.alternates?.canonical).toBe("/en/about");
    expect(meta.alternates?.languages?.["en-US"]).toBe("/en/about");
    expect(meta.alternates?.languages?.["fa-IR"]).toBe("/about");
  });

  it("sets the right OpenGraph locale fields per language", () => {
    const fa = buildLocalizedMetadata({ locale: "fa", path: "/about", ...base });
    expect(fa.openGraph?.locale).toBe("fa_IR");
    expect(fa.openGraph?.alternateLocale).toBe("en_US");

    const en = buildLocalizedMetadata({ locale: "en", path: "/about", ...base });
    expect(en.openGraph?.locale).toBe("en_US");
    expect(en.openGraph?.alternateLocale).toBe("fa_IR");
  });

  it("marks absolute titles when requested", () => {
    const meta = buildLocalizedMetadata({
      locale: "fa",
      path: "/",
      ...base,
      absoluteTitle: true,
    });
    expect(meta.title).toEqual({ absolute: base.title });
  });

  it("uses a plain title otherwise", () => {
    const meta = buildLocalizedMetadata({ locale: "fa", path: "/", ...base });
    expect(meta.title).toBe(base.title);
  });

  it("adds noindex robots for internal pages", () => {
    const meta = buildLocalizedMetadata({
      locale: "fa",
      path: "/search",
      ...base,
      noindex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("passes JSON-LD payloads through to the returned object", () => {
    const jsonLd: JsonLdObject[] = [
      { "@context": "https://schema.org", "@type": "WebPage" },
    ];
    const meta = buildLocalizedMetadata({
      locale: "fa",
      path: "/about",
      ...base,
      jsonLd,
    });
    // `jsonLd` is a pass-through field on this helper's return value. Pages
    // render the payload separately via <JsonLdRenderer>, so it is not part
    // of the Next.js `Metadata` type — read it through the app's own shape.
    const carried = meta as unknown as { jsonLd?: JsonLdObject[] };
    expect(carried.jsonLd).toEqual(jsonLd);
  });
});