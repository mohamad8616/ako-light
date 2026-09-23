import { describe, expect, it } from "vitest";
import { designerFormSchema } from "@/lib/admin/schemas/designer";

describe("designerFormSchema", () => {
  const validInput = {
    slug: "massimo-castagna",
    name: { en: "Massimo Castagna", fa: "ماسیمو کاستانья" },
    image: "/images/designer.jpg",
    website: "https://massimocastagna.com",
    bio: [{ en: "Paragraph 1", fa: "پاراگراف 1" }, { en: "Paragraph 2", fa: "پاراگراف 2" }],
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = designerFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with website null", () => {
    const input = { ...validInput, website: null };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with empty bio array", () => {
    const input = { ...validInput, bio: [] };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Massimo-Castagna" };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects name with empty en", () => {
    const input = { ...validInput, name: { en: "", fa: "ماسیمو" } };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid website format (not URL)", () => {
    const input = { ...validInput, website: "invalid" };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects bio with empty en", () => {
    const input = { ...validInput, bio: [{ en: "", fa: "پاراگراف 1" }] };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = designerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});