/**
 * Step 5 — zod adversarial edge cases for trickier schemas.
 *
 * The existing happy-path tests cover valid input; this file deliberately
 * throws malformed / adversarial payloads at the two schemas that use
 * unions and arrays (product images + project credits) and asserts:
 *   1. validation fails (no false positives);
 *   2. the zod issues map through `zodIssuesToFieldIssues` to structured
 *      field issues (`required` | `tooLong` | `invalid`) — never throws, never
 *      leaks English prose;
 *   3. oversized strings are **rejected** at the schema's `.max()` cap
 *      (lib/admin/schemas/common.ts) and surface as the field-level `tooLong`
 *      issue, so the form shows a real message instead of a zod default. (The
 *      original pass recorded these as accepted — SHOULD-have-failed-but-didn't;
 *      the caps close that finding.)
 *
 * Pure unit tier: no DB, no mocks needed beyond importing the schemas and
 * the result mapper.
 */
import { describe, expect, it } from "vitest";
import { productFormSchema, productImageSchema } from "@/lib/admin/schemas/product";
import { projectFormSchema } from "@/lib/admin/schemas/project";
import { TEXT_MAX, URL_MAX } from "@/lib/admin/schemas/common";
import { zodIssuesToFieldIssues } from "@/lib/admin/result";

/**
 * One character past the cap a field is supposed to enforce — asserting the
 * boundary explicitly (the cap itself must still be accepted).
 */

function mapFailure(schema: typeof productFormSchema | typeof projectFormSchema | typeof productImageSchema, input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected the payload to fail validation");
  return zodIssuesToFieldIssues(parsed.error);
}

const baseProduct = {
  slug: "test-product",
  name: { en: "Test", fa: "تست" },
  hoverImage: "/images/hover.jpg",
  heroImage: "/images/hero.jpg",
  priceEur: 10,
  priceToman: 500_000,
  existsInStore: true,
  quantity: 1,
  description: { en: "Desc", fa: "توضیح" },
  moreInfo: null,
  downloads: [],
  related: [],
  sortOrder: 0,
  categoryId: "lighting",
  designerId: null,
  images: [],
};

const baseProject = {
  slug: "test-project",
  name: { en: "Test", fa: "تست" },
  location: "Somewhere",
  year: "2026",
  image: "/images/project.jpg",
  description: { en: "Desc", fa: "توضیح" },
  paragraph: { en: "Para", fa: "پارا" },
  moreDescription: [],
  credits: [],
  portfolioImages: [],
  textImageUrl: "",
  textImageText: { en: "", fa: "" },
  fullImageUrl: "",
  fullImageCaption: { en: "", fa: "" },
  sortOrder: 0,
  productIds: [],
};

describe("productImageSchema — adversarial", () => {
  it("rejects url as number (wrong type)", () => {
    const issues = mapFailure(productImageSchema, { url: 42, alt: "x", isPrimary: true });
    expect(issues.some((i) => i.field === "url" && i.code === "required")).toBe(true);
  });

  it("rejects alt as number (must be string|null)", () => {
    const issues = mapFailure(productImageSchema, { url: "/x.jpg", alt: 123, isPrimary: true });
    expect(issues.some((i) => i.field === "alt" && i.code === "required")).toBe(true);
  });

  it("rejects isPrimary as string (must be boolean)", () => {
    const issues = mapFailure(productImageSchema, { url: "/x.jpg", alt: "x", isPrimary: "yes" });
    expect(issues.some((i) => i.field === "isPrimary" && i.code === "required")).toBe(true);
  });

  it("rejects missing isPrimary", () => {
    const issues = mapFailure(productImageSchema, { url: "/x.jpg", alt: "x" });
    expect(issues.some((i) => i.field === "isPrimary" && i.code === "required")).toBe(true);
  });
});

describe("productImageSchema — adversarial (url format)", () => {
  it("rejects url not a valid path/url (bare filename)", () => {
    const issues = mapFailure(productImageSchema, { url: "images/hero.jpg", alt: "x", isPrimary: true });
    expect(issues.some((i) => i.field === "url" && i.code === "invalid")).toBe(true);
  });

  it("rejects oversized url (bounded by URL_MAX in imageRefSchema)", () => {
    const huge = "/images/" + "a".repeat(10_000) + ".jpg";
    const issues = mapFailure(productImageSchema, { url: huge, alt: "x", isPrimary: true });
    expect(issues.some((i) => i.field === "url" && i.code === "tooLong")).toBe(true);
  });

  it("accepts a url exactly at URL_MAX (the cap is a ceiling, not a content rule)", () => {
    const atCap = "/" + "a".repeat(URL_MAX - 1);
    expect(atCap).toHaveLength(URL_MAX);
    const result = productImageSchema.safeParse({ url: atCap, alt: "x", isPrimary: true });
    expect(result.success).toBe(true);
  });

  it("rejects oversized alt text", () => {
    const issues = mapFailure(productImageSchema, {
      url: "/x.jpg",
      alt: "a".repeat(400),
      isPrimary: true,
    });
    expect(issues.some((i) => i.field === "alt" && i.code === "tooLong")).toBe(true);
  });
});

describe("productFormSchema.images array — adversarial", () => {
  it("rejects images as string instead of array", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: "not-an-array" });
    expect(issues.some((i) => i.field === "images" && i.code === "required")).toBe(true);
  });

  it("rejects images as null", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: null });
    expect(issues.some((i) => i.field === "images" && i.code === "required")).toBe(true);
  });

  it("rejects array containing non-object entry", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: ["plain-string"] });
    expect(issues.some((i) => i.field.startsWith("images.") && i.code === "required")).toBe(true);
  });

  it("rejects entry with url as number", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: [{ url: 42, alt: "x", isPrimary: true }] });
    expect(issues.some((i) => i.field === "images.0.url" && i.code === "required")).toBe(true);
  });

  it("rejects entry with isPrimary as string", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: [{ url: "/x.jpg", alt: "x", isPrimary: "yes" }] });
    expect(issues.some((i) => i.field === "images.0.isPrimary" && i.code === "required")).toBe(true);
  });

  it("rejects entry with alt as number", () => {
    const issues = mapFailure(productFormSchema, { ...baseProduct, images: [{ url: "/x.jpg", alt: 123, isPrimary: true }] });
    expect(issues.some((i) => i.field === "images.0.alt" && i.code === "required")).toBe(true);
  });

  it("rejects entry with oversized url (bounded by URL_MAX)", () => {
    const huge = "/images/" + "a".repeat(10_000) + ".jpg";
    const issues = mapFailure(productFormSchema, {
      ...baseProduct,
      images: [{ url: huge, alt: "x", isPrimary: true }],
    });
    expect(issues.some((i) => i.field === "images.0.url" && i.code === "tooLong")).toBe(true);
  });
});

describe("projectFormSchema.credits array (localizedListSchema) — adversarial", () => {
  it("rejects credits as string instead of array", () => {
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: "not-an-array" });
    expect(issues.some((i) => i.field === "credits" && i.code === "required")).toBe(true);
  });

  it("rejects credits as null", () => {
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: null });
    expect(issues.some((i) => i.field === "credits" && i.code === "required")).toBe(true);
  });

  it("rejects array containing a number (must be a Localized pair)", () => {
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: [42] });
    expect(issues.some((i) => i.field === "credits.0" && i.code === "required")).toBe(true);
  });

  it("rejects array containing an object that is not Localized", () => {
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: [{ foo: "bar" }] });
    // Both halves are missing, so each gets its own issue on its own path.
    expect(issues.some((i) => i.field === "credits.0.en" && i.code === "required")).toBe(true);
    expect(issues.some((i) => i.field === "credits.0.fa" && i.code === "required")).toBe(true);
  });

  it("rejects array containing an empty string (a plain string is no longer a credit)", () => {
    // Credits used to accept a plain string shared across both languages. The
    // form now edits every credit as a pair, so a string is a shape error.
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: [""] });
    expect(issues.some((i) => i.field === "credits.0" && i.code === "required")).toBe(true);
  });

  it("rejects a plain-string credit — the shape is gone, not just discouraged", () => {
    const issues = mapFailure(projectFormSchema, {
      ...baseProject,
      credits: ["Plain credit"],
    });
    expect(issues.some((i) => i.field === "credits.0")).toBe(true);
  });

  it("rejects array containing a half-translated Localized pair", () => {
    const issues = mapFailure(projectFormSchema, { ...baseProject, credits: [{ en: "Credit", fa: "" }] });
    expect(issues.some((i) => i.field === "credits.0.fa" && i.code === "required")).toBe(true);
  });

  it("accepts a complete Localized pair", () => {
    const result = projectFormSchema.safeParse({
      ...baseProject,
      credits: [{ en: "A", fa: "ب" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an EMPTY credits list — a project may have no credits", () => {
    expect(
      projectFormSchema.safeParse({ ...baseProject, credits: [] }).success,
    ).toBe(true);
  });

  it("rejects oversized Localized pair credit (bounded by TEXT_MAX per half)", () => {
    const huge = "a".repeat(10_000);
    const issues = mapFailure(projectFormSchema, {
      ...baseProject,
      credits: [{ en: huge, fa: huge }],
    });
    expect(issues.some((i) => i.field === "credits.0.en" && i.code === "tooLong")).toBe(true);
    expect(issues.some((i) => i.field === "credits.0.fa" && i.code === "tooLong")).toBe(true);
  });

  it("accepts a Localized pair credit exactly at TEXT_MAX per half", () => {
    const atCap = "a".repeat(TEXT_MAX);
    const result = projectFormSchema.safeParse({
      ...baseProject,
      credits: [{ en: atCap, fa: atCap }],
    });
    expect(result.success).toBe(true);
  });
});