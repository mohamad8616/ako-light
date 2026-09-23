import { describe, expect, it } from "vitest";
import { collectionFormSchema } from "@/lib/admin/schemas/collection";

describe("collectionFormSchema", () => {
  const validInput = {
    slug: "ritual-gravity",
    name: { en: "Ritual Gravity", fa: "مراسم گرانی" },
    year: "2026",
    image: "/images/collection.jpg",
    description: {
      p1: { en: "Paragraph 1", fa: "پاراگراف 1" },
      p2: { en: "Paragraph 2", fa: "پاراگراف 2" },
      p3: { en: "Paragraph 3", fa: "پاراگراف 3" },
    },
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = collectionFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Ritual-Gravity" };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects name with empty en", () => {
    const input = { ...validInput, name: { en: "", fa: "مراسم" } };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing year", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).year;
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty year", () => {
    const input = { ...validInput, year: "" };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).description;
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects description missing p1", () => {
    const input = { ...validInput, description: { p2: validInput.description.p2, p3: validInput.description.p3 } as typeof validInput.description };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects description p1 with empty en", () => {
    const input = { ...validInput, description: { p1: { en: "", fa: "پاراگراف 1" }, p2: validInput.description.p2, p3: validInput.description.p3 } };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects description missing p2", () => {
    const input = { ...validInput, description: { p1: validInput.description.p1, p3: validInput.description.p3 } as typeof validInput.description };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects description missing p3", () => {
    const input = { ...validInput, description: { p1: validInput.description.p1, p2: validInput.description.p2 } as typeof validInput.description };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = collectionFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});