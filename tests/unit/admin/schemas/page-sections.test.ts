import { describe, expect, it } from "vitest";
import {
  aboutSectionSchemas,
  aboutBrandStorySectionSchema,
  aboutEleganceSectionSchema,
  aboutHeroSectionSchema,
  aboutSubtitleSectionSchema,
} from "@/lib/admin/schemas/about";
import {
  s34SectionSchemas,
  s34HeroSectionSchema,
  s34KickerSectionSchema,
} from "@/lib/admin/schemas/s34";
import { TEXT_MAX } from "@/lib/admin/schemas/common";

/**
 * Part D — the /about and /s34 page-section schemas.
 *
 * Two rules these all share, the opposite of the homepage override schemas:
 * a section row owns its copy outright (no linked entity to fall back to), so
 * every field is REQUIRED — a half-translated pair surfaces on its empty half
 * instead of being stored as a half-empty cell, and a paragraph row left blank
 * (the "add" button seeds an empty row on purpose) is a field error rather than
 * a silently empty string on the public page.
 */
const PAIR = { en: "Test", fa: "تست" };

const aboutHero = { firstLine: PAIR, secondLine: PAIR };
const aboutSubtitle = { paragraph: PAIR };
const aboutBrandStory = {
  title: PAIR,
  paragraphs: [PAIR, PAIR],
  block1Alt: PAIR,
  block1Paragraphs: [PAIR],
  block2Alt: PAIR,
  block2Paragraph: PAIR,
};
const aboutElegance = { title: PAIR, paragraphs: [PAIR] };
const s34Hero = { title: PAIR, subtitle: PAIR };
const s34Kicker = { kicker: PAIR, paragraphs: [PAIR] };

describe("page section schemas — about", () => {
  it("registers exactly the four AboutPageSection rows", () => {
    expect(Object.keys(aboutSectionSchemas)).toEqual([
      "heroSection",
      "subtitleSection",
      "brandStorySection",
      "eleganceSection",
    ]);
  });

  it("accepts a complete payload for every section", () => {
    const payloads: Record<keyof typeof aboutSectionSchemas, unknown> = {
      heroSection: aboutHero,
      subtitleSection: aboutSubtitle,
      brandStorySection: aboutBrandStory,
      eleganceSection: aboutElegance,
    };

    for (const [key, schema] of Object.entries(aboutSectionSchemas)) {
      expect(
        schema.safeParse(payloads[key as keyof typeof payloads]).success,
        key,
      ).toBe(true);
    }
  });

  it("rejects a half-translated hero line on the empty half", () => {
    const result = aboutHeroSectionSchema.safeParse({
      ...aboutHero,
      secondLine: { en: "Second", fa: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "secondLine.fa",
        ),
      ).toBe(true);
    }
  });

  it("rejects a blank paragraph row in the elegance list", () => {
    const result = aboutEleganceSectionSchema.safeParse({
      ...aboutElegance,
      paragraphs: [PAIR, { en: "", fa: "" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "paragraphs.1.en",
        ),
      ).toBe(true);
    }
  });

  it("rejects a paragraph longer than the shared text cap", () => {
    const result = aboutEleganceSectionSchema.safeParse({
      ...aboutElegance,
      paragraphs: [{ en: "a".repeat(TEXT_MAX + 1), fa: "تست" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.code).toBe("too_big");
    }
  });
});

describe("page section schemas — s34", () => {
  it("registers exactly the four S34PageSection rows", () => {
    expect(Object.keys(s34SectionSchemas)).toEqual([
      "heroSection",
      "conceptSection",
      "gallerySection",
      "harmonySection",
    ]);
  });

  it("maps the three kicker sections onto the shared kicker schema", () => {
    expect(s34SectionSchemas.conceptSection).toBe(s34KickerSectionSchema);
    expect(s34SectionSchemas.gallerySection).toBe(s34KickerSectionSchema);
    expect(s34SectionSchemas.harmonySection).toBe(s34KickerSectionSchema);
  });

  it("accepts complete hero and kicker payloads", () => {
    expect(s34HeroSectionSchema.safeParse(s34Hero).success).toBe(true);
    expect(s34KickerSectionSchema.safeParse(s34Kicker).success).toBe(true);
  });

  it("accepts an empty paragraph list (a kicker-only section is legal)", () => {
    expect(
      s34KickerSectionSchema.safeParse({ kicker: PAIR, paragraphs: [] }).success,
    ).toBe(true);
  });

  it("rejects a hero title with an empty half", () => {
    const result = s34HeroSectionSchema.safeParse({
      title: { en: "", fa: "تست" },
      subtitle: PAIR,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "title.en"),
      ).toBe(true);
    }
  });

  it("rejects a kicker section sent with the hero's shape", () => {
    // The action dispatches on sectionKey, so a wrong-shaped payload has to
    // fail here rather than being written under another section's rules.
    expect(s34KickerSectionSchema.safeParse(s34Hero).success).toBe(false);
    expect(s34HeroSectionSchema.safeParse(s34Kicker).success).toBe(false);
  });
});