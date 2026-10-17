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
    gallery: [
      "/images/gallery-1.jpg",
      "/images/gallery-2.jpg",
      "/images/gallery-3.jpg",
      "/images/gallery-4.jpg",
      "/images/gallery-5.jpg",
    ],
    usedProducts: [
      {
        name: { en: "Sisma", fa: "سیزما" },
        slug: "sisma",
        category: "tables",
        image: "/images/sisma.jpg",
      },
    ],
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = collectionFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts an empty used-products list (the section is optional)", () => {
    const result = collectionFormSchema.safeParse({
      ...validInput,
      usedProducts: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a gallery with fewer than five photos", () => {
    const result = collectionFormSchema.safeParse({
      ...validInput,
      gallery: validInput.gallery.slice(0, 4),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("gallery"));
      // Its own code so the field can say "add at least 5 photos" instead of
      // the blanket "Invalid value." (see lib/admin/result.ts).
      expect(issue?.code).toBe("tooFewImages");
    }
  });

  it("rejects a gallery entry that is not an image reference", () => {
    const result = collectionFormSchema.safeParse({
      ...validInput,
      gallery: [...validInput.gallery.slice(0, 4), "not-a-url"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join(".") === "gallery.4"),
      ).toBe(true);
    }
  });

  it("rejects a used-products row missing its image", () => {
    const result = collectionFormSchema.safeParse({
      ...validInput,
      usedProducts: [
        { name: { en: "Sisma", fa: "سیزما" }, slug: "sisma", category: "tables" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.join(".").startsWith("usedProducts.0"),
        ),
      ).toBe(true);
    }
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