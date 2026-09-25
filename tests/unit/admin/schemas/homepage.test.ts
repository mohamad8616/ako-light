import { describe, expect, it } from "vitest";
import {
  catalogueFeatureFormSchema,
  flagshipOneFeatureFormSchema,
  homeCollectionFeatureFormSchema,
  projectBannerFeatureFormSchema,
  projectDarkBackgroundFeatureFormSchema,
} from "@/lib/admin/schemas/homepage";

/**
 * Part D — the homepage slot schemas.
 *
 * The one rule these all share is that a slot's override columns are CLEARABLE:
 * an empty pair / empty list / empty string means "not overridden" (the action
 * writes SQL NULL and the banner falls back to its linked entity), while a
 * half-filled pair is a mistake that must surface on the empty half.
 */
describe("homepage slot schemas", () => {
  const clearedFlagshipSlot = {
    enabled: true,
    mode: "reference",
    flagshipId: "henge-paris",
    kicker: { en: "", fa: "" },
    title: { en: "", fa: "" },
    paragraphs: [],
    image: "",
  };

  it("accepts a reference-mode slot with every override cleared", () => {
    const result = flagshipOneFeatureFormSchema.safeParse(clearedFlagshipSlot);
    expect(result.success).toBe(true);
  });

  it("accepts a fully overridden slot", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      mode: "override",
      kicker: { en: "Paris", fa: "پاریس" },
      title: { en: "Henge Paris", fa: "هنج پاریس" },
      paragraphs: [{ en: "First", fa: "اول" }],
      image: "/images/paris.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a half-filled override pair on the empty half", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      title: { en: "Henge Paris", fa: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "title.fa"),
      ).toBe(true);
    }
  });

  it("rejects a missing entity id", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      flagshipId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown content mode", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      mode: "custom",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image override that is neither a reference nor cleared", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      image: "not-an-image",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a paragraph row that is only half translated", () => {
    const result = flagshipOneFeatureFormSchema.safeParse({
      ...clearedFlagshipSlot,
      paragraphs: [{ en: "Only English", fa: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("validates the project banner slot", () => {
    const cleared = {
      enabled: false,
      mode: "override",
      projectId: "h-istra",
      kicker: { en: "", fa: "" },
      title: { en: "", fa: "" },
      image: "",
    };
    expect(projectBannerFeatureFormSchema.safeParse(cleared).success).toBe(true);
    expect(
      projectBannerFeatureFormSchema.safeParse({ ...cleared, projectId: "" })
        .success,
    ).toBe(false);
  });

  it("validates the dark-background project slot", () => {
    const cleared = {
      enabled: true,
      mode: "reference",
      projectId: "vocla-2026",
      title: { en: "", fa: "" },
      paragraphs: [],
      image: "",
    };
    expect(
      projectDarkBackgroundFeatureFormSchema.safeParse(cleared).success,
    ).toBe(true);
    expect(
      projectDarkBackgroundFeatureFormSchema.safeParse({
        ...cleared,
        title: { en: "Vocla", fa: "" },
      }).success,
    ).toBe(false);
  });

  it("requires complete content on the standalone home-collection slot", () => {
    const valid = {
      enabled: true,
      image: "/images/collection.jpg",
      title: { en: "Home Collection", fa: "مجموعهٔ خانه" },
      text: { en: "Explore the collection.", fa: "مجموعه را ببینید." },
    };
    expect(homeCollectionFeatureFormSchema.safeParse(valid).success).toBe(true);
    // Nothing to fall back to: a half-translated pair cannot be "cleared".
    expect(
      homeCollectionFeatureFormSchema.safeParse({
        ...valid,
        title: { en: "Home Collection", fa: "" },
      }).success,
    ).toBe(false);
    expect(
      homeCollectionFeatureFormSchema.safeParse({ ...valid, image: "" })
        .success,
    ).toBe(false);
  });

  it("validates the catalogue slot", () => {
    const valid = {
      enabled: true,
      catalogueItemId: "s34-5",
      image: "/images/catalogue.jpg",
    };
    expect(catalogueFeatureFormSchema.safeParse(valid).success).toBe(true);
    expect(
      catalogueFeatureFormSchema.safeParse({ ...valid, catalogueItemId: "" })
        .success,
    ).toBe(false);
  });
});
