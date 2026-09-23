import { describe, expect, it } from "vitest";
import { productFormSchema, productImageSchema } from "@/lib/admin/schemas/product";

describe("productFormSchema", () => {
  const validInput = {
    slug: "test-product",
    name: { en: "Test Product", fa: "محصول تست" },
    hoverImage: "/images/hover.jpg",
    heroImage: "/images/hero.jpg",
    price: 99.99,
    existsInStore: true,
    quantity: 10,
    description: { en: "Description", fa: "توضیحات" },
    moreInfo: { en: "More info", fa: "اطلاعات بیشتر" },
    downloads: [{ label: { en: "PDF", fa: "پی‌دی‌اف" }, href: "/downloads/test.pdf" }],
    related: [
      { name: { en: "Related", fa: "مرتبط" }, slug: "related-product", category: "lighting", image: "/images/related.jpg" },
    ],
    sortOrder: 0,
    categoryId: "lighting",
    designerId: "massimo-castagna",
    images: [
      { url: "/images/1.jpg", alt: "Image 1", isPrimary: true },
      { url: "/images/2.jpg", alt: "Image 2", isPrimary: false },
    ],
  };

  it("accepts valid input", () => {
    const result = productFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Test-Product" };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format (double hyphen)", () => {
    const input = { ...validInput, slug: "test--product" };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput, name: { en: "", fa: "تست" } };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true);
    }
  });

  it("rejects missing price", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).price;
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const input = { ...validInput, price: -1 };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const input = { ...validInput, quantity: -1 };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    const input = { ...validInput, quantity: 1.5 };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing hoverImage", () => {
    const input = { ...validInput, hoverImage: "" };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid hoverImage (not URL or path)", () => {
    const input = { ...validInput, hoverImage: "invalid" };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts nullable moreInfo as null", () => {
    const input = { ...validInput, moreInfo: null };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects explicit undefined for moreInfo (nullable is not optional — the form normalizes undefined to null)", () => {
    const input = { ...validInput, moreInfo: undefined };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("moreInfo"))).toBe(true);
    }
  });

  it("accepts empty downloads array", () => {
    const input = { ...validInput, downloads: [] };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects download with invalid href", () => {
    const input = {
      ...validInput,
      downloads: [{ label: { en: "PDF", fa: "پی‌دی‌اف" }, href: "invalid" }],
    };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts download with # href", () => {
    const input = {
      ...validInput,
      downloads: [{ label: { en: "PDF", fa: "پی‌دی‌اف" }, href: "#" }],
    };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects related with invalid slug format", () => {
    const input = {
      ...validInput,
      related: [{ name: { en: "Related", fa: "مرتبط" }, slug: "Related-Product", category: "lighting", image: "/images/related.jpg" }],
    };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing categoryId", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).categoryId;
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts designerId as null", () => {
    const input = { ...validInput, designerId: null };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects images array with invalid imageRef", () => {
    const input = { ...validInput, images: [{ url: "invalid", alt: "test", isPrimary: true }] };
    const result = productFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("productImageSchema", () => {
  it("accepts valid image object", () => {
    const result = productImageSchema.safeParse({
      url: "/images/test.jpg",
      alt: "Test",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing url", () => {
    const result = productImageSchema.safeParse({ alt: "Test", isPrimary: true });
    expect(result.success).toBe(false);
  });

  it("rejects invalid url format", () => {
    const result = productImageSchema.safeParse({ url: "invalid", alt: "Test", isPrimary: true });
    expect(result.success).toBe(false);
  });

  it("rejects missing isPrimary", () => {
    const result = productImageSchema.safeParse({ url: "/images/test.jpg", alt: "Test" });
    expect(result.success).toBe(false);
  });

  it("accepts id for existing images", () => {
    const result = productImageSchema.safeParse({
      id: "existing-id",
      url: "/images/test.jpg",
      alt: "Test",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
  });
});