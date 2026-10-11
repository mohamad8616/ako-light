/**
 * Pass D.1 — the hero and video-section form schemas.
 *
 * These are the SERVER's rules as much as the browser's: `updateHeroFeatureAction`
 * and `updateVideoFeatureAction` re-parse the same schema, so anything accepted
 * here is what a forged POST can persist. The cases below therefore cover the
 * two things that matter — that a clearable field really can be cleared (or the
 * built-in content could never be restored), and that a hostile destination or
 * media URL is refused.
 */
import { describe, expect, it } from "vitest";

import {
  heroFeatureFormSchema,
  videoFeatureFormSchema,
} from "@/lib/admin/schemas/homepage";

/** A hero submission with every field cleared — the "use the built-ins" case. */
const clearedHero = {
  enabled: true,
  videoUrl: "",
  posterUrl: "",
  firstLine: { en: "", fa: "" },
  secondLine: { en: "", fa: "" },
  ctaLabel: { en: "", fa: "" },
  ctaHref: "",
};

describe("heroFeatureFormSchema", () => {
  it("accepts an entirely cleared form — clearing means 'use the built-in'", () => {
    const parsed = heroFeatureFormSchema.safeParse(clearedHero);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("accepts a fully overridden form", () => {
    const parsed = heroFeatureFormSchema.safeParse({
      enabled: true,
      videoUrl: "https://bucket.liara.space/media/homepage/hero.mp4",
      posterUrl: "/videos/hero-poster.jpg",
      firstLine: { en: "2026 Collection", fa: "کلکسیون ۲۰۲۶" },
      secondLine: { en: "Ritual Gravity", fa: "ریچوال گرویتی" },
      ctaLabel: { en: "Read more", fa: "بیشتر بخوانید" },
      ctaHref: "/catalogue",
    });
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("requires both languages in a localized field, or neither", () => {
    // A half-translated pair is a mistake, not a partial override: rendering it
    // would show English to a Persian visitor for that one line.
    const parsed = heroFeatureFormSchema.safeParse({
      ...clearedHero,
      firstLine: { en: "Only English", fa: "" },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(["firstLine", "fa"]);
    }
  });

  it("rejects a media URL that is neither absolute http(s) nor root-relative", () => {
    for (const videoUrl of [
      "javascript:alert(1)",
      "data:video/mp4;base64,AAAA",
      "not a url",
    ]) {
      const parsed = heroFeatureFormSchema.safeParse({ ...clearedHero, videoUrl });
      expect(parsed.success, videoUrl).toBe(false);
    }
  });

  it("accepts a protocol-relative URL, because the rule is `startsWith('/')`", () => {
    // Pinned rather than "fixed": the shared media-ref rule is
    // "absolute http(s) OR starts with /", so `//example.com/x.mp4` passes.
    // That is not a new risk — an admin can already paste any https URL into
    // every image field in this project — and tightening the shared primitive
    // would change other screens and possibly existing rows. Verified against
    // the real policy rather than assumed (same finding as the catalogue CTA
    // schema test, Pass C.3).
    expect(
      heroFeatureFormSchema.safeParse({
        ...clearedHero,
        videoUrl: "//example.com/x.mp4",
      }).success,
    ).toBe(true);
  });

  it("rejects an unsafe CTA destination, with the project's own link code", () => {
    for (const ctaHref of [
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:msgbox(1)",
      "ftp://example.com/x",
      "not a url",
    ]) {
      const parsed = heroFeatureFormSchema.safeParse({ ...clearedHero, ctaHref });
      expect(parsed.success, ctaHref).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.code, ctaHref).toBe("invalidLink");
      }
    }
  });

  it("accepts the three documented link shapes", () => {
    for (const ctaHref of [
      "https://example.com/catalogue",
      "/catalogue",
      "#",
      "",
    ]) {
      const parsed = heroFeatureFormSchema.safeParse({ ...clearedHero, ctaHref });
      expect(parsed.success, ctaHref).toBe(true);
    }
  });

  it("trims a pasted URL before judging it", () => {
    // Copying a URL out of a browser or a PDF routinely adds padding, and the
    // link rule is anchored — so the value is trimmed, not rejected.
    const parsed = heroFeatureFormSchema.safeParse({
      ...clearedHero,
      ctaHref: "  https://example.com/catalogue  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ctaHref).toBe("https://example.com/catalogue");
    }
  });

  it("requires `enabled`", () => {
    // Everything else is the cleared form; only `enabled` is missing.
    const parsed = heroFeatureFormSchema.safeParse({
      videoUrl: "",
      posterUrl: "",
      firstLine: { en: "", fa: "" },
      secondLine: { en: "", fa: "" },
      ctaLabel: { en: "", fa: "" },
      ctaHref: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("videoFeatureFormSchema", () => {
  it("accepts a cleared video — the built-in asset stays", () => {
    const parsed = videoFeatureFormSchema.safeParse({
      enabled: true,
      videoUrl: "",
    });
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("accepts a stored URL and a public path", () => {
    for (const videoUrl of [
      "https://bucket.liara.space/media/homepage/afterhenge.mp4",
      "/videos/afterhenge.mp4",
    ]) {
      expect(videoFeatureFormSchema.safeParse({ enabled: true, videoUrl }).success)
        .toBe(true);
    }
  });

  it("rejects anything that is not a real media address", () => {
    for (const videoUrl of [
      "javascript:alert(1)",
      "data:video/mp4;base64,AAAA",
      "not a url",
    ]) {
      expect(
        videoFeatureFormSchema.safeParse({ enabled: true, videoUrl }).success,
        videoUrl,
      ).toBe(false);
    }
  });
});
