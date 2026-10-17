import { describe, expect, it } from "vitest";
import { materialCategoryFormSchema } from "@/lib/admin/schemas/material-category";
import { materialItemFormSchema } from "@/lib/admin/schemas/material-item";

describe("materialCategoryFormSchema", () => {
  const valid = {
    slug: "leather",
    name: { en: "Leather", fa: "چرم" },
    image: "/materials/leather-cover.jpg",
    sortOrder: 0,
  };

  it("accepts localized category content with its cover image", () => {
    expect(materialCategoryFormSchema.safeParse(valid).success).toBe(true);
  });

  it("requires both localized names and a valid image reference", () => {
    expect(materialCategoryFormSchema.safeParse({ ...valid, name: { en: "Leather", fa: "" } }).success).toBe(false);
    expect(materialCategoryFormSchema.safeParse({ ...valid, image: "" }).success).toBe(false);
  });
});

describe("materialItemFormSchema", () => {
  const valid = {
    slug: "leather-001",
    name: { en: "Leather 001", fa: "چرم ۰۰۱" },
    categoryId: "material-category-leather",
    image: "/materials/leather-001.jpg",
    code: "",
    swatchColor: "",
    sortOrder: 0,
  };

  it("requires an explicit category id, bilingual name, and image", () => {
    expect(materialItemFormSchema.safeParse(valid).success).toBe(true);
    expect(materialItemFormSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
    expect(materialItemFormSchema.safeParse({ ...valid, image: "" }).success).toBe(false);
    expect(materialItemFormSchema.safeParse({ ...valid, name: { en: "Leather 001", fa: "" } }).success).toBe(false);
  });
});
