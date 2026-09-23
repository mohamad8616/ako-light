import { describe, expect, it } from "vitest";
import { catalogueFormSchema } from "@/lib/admin/schemas/catalogue";

describe("catalogueFormSchema", () => {
  const validInput = {
    id: "s34-5",
    title: "S34/5",
    href: "https://example.com/catalogue.pdf",
    coverColor: "#3a3530",
    coverTextColor: "#232323",
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = catalogueFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with coverTextColor null", () => {
    const input = { ...validInput, coverTextColor: null };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with # href", () => {
    const input = { ...validInput, href: "#" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with relative href", () => {
    const input = { ...validInput, href: "/catalogue/s34-5.pdf" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing required id", () => {
    const input = { ...validInput, id: "" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("id"))).toBe(true);
    }
  });

  it("rejects invalid id format (uppercase)", () => {
    const input = { ...validInput, id: "S34-5" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid id format (double hyphen)", () => {
    const input = { ...validInput, id: "s34--5" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).title;
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const input = { ...validInput, title: "" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing href", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).href;
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid href format", () => {
    const input = { ...validInput, href: "invalid" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing coverColor", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).coverColor;
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid coverColor format (no hash)", () => {
    const input = { ...validInput, coverColor: "3a3530" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid coverColor format (wrong chars)", () => {
    const input = { ...validInput, coverColor: "#GGGGGG" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts 3-digit hex coverColor", () => {
    const input = { ...validInput, coverColor: "#abc" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts 8-digit hex coverColor", () => {
    const input = { ...validInput, coverColor: "#3a3530FF" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts valid coverTextColor", () => {
    const input = { ...validInput, coverTextColor: "#ffffff" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid coverTextColor format", () => {
    const input = { ...validInput, coverTextColor: "#GGGGGG" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});