import { describe, expect, it } from "vitest";
import { materialFormSchema, MATERIAL_TYPE_VALUES } from "@/lib/admin/schemas/material";

describe("materialFormSchema", () => {
  const validInput = {
    slug: "test-material",
    name: { en: "Test Material", fa: "ماده تست" },
    category: "Stone",
    type: "stone",
    image: "/images/material.jpg",
    description: { en: "Description", fa: "توضیحات" },
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = materialFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Test-Material" };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).category;
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const input = { ...validInput, category: "" };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type (not in enum)", () => {
    const input = { ...validInput, type: "plastic" };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts all valid MATERIAL_TYPE_VALUES", () => {
    for (const type of MATERIAL_TYPE_VALUES) {
      const input = { ...validInput, type };
      const result = materialFormSchema.safeParse(input);
      expect(result.success, `type: ${type}`).toBe(true);
    }
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).description;
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = materialFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});