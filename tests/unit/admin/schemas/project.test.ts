import { describe, expect, it } from "vitest";
import { projectFormSchema } from "@/lib/admin/schemas/project";

describe("projectFormSchema", () => {
  const validInput = {
    slug: "h-istra",
    i18nKey: "projects.hIstra",
    name: { en: "H Istra", fa: "اچ ایستر" },
    location: "Istra, Croatia",
    year: "2026",
    image: "/images/project.jpg",
    description: { en: "Description", fa: "توضیحات" },
    paragraph: { en: "Paragraph", fa: "پاراگراف" },
    moreDescription: [{ en: "More 1", fa: "بیشتر 1" }, { en: "More 2", fa: "بیشتر 2" }],
    credits: [{ en: "Credit 1", fa: "اعتبار 1" }, "Plain string credit"],
    portfolioImages: ["/images/portfolio1.jpg", "/images/portfolio2.jpg"],
    sortOrder: 0,
    productIds: ["pendant-light", "sofa"],
  };

  it("accepts valid input", () => {
    const result = projectFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "H-Istra" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing i18nKey", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).i18nKey;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty i18nKey", () => {
    const input = { ...validInput, i18nKey: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects name with empty en", () => {
    const input = { ...validInput, name: { en: "", fa: "ایستر" } };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing location", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).location;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty location", () => {
    const input = { ...validInput, location: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing year", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).year;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty year", () => {
    const input = { ...validInput, year: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).description;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing paragraph", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).paragraph;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing moreDescription", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).moreDescription;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects moreDescription with empty en", () => {
    const input = { ...validInput, moreDescription: [{ en: "", fa: "بیشتر 1" }] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing credits", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).credits;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts credits with mixed localized and plain strings", () => {
    const input = { ...validInput, credits: [{ en: "Credit", fa: "اعتبار" }, "Plain string"] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing portfolioImages", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).portfolioImages;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects portfolioImages with invalid format", () => {
    const input = { ...validInput, portfolioImages: ["invalid"] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing productIds", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).productIds;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts empty productIds array", () => {
    const input = { ...validInput, productIds: [] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects productIds with empty string", () => {
    const input = { ...validInput, productIds: [""] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});