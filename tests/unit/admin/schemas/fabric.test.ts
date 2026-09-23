import { describe, expect, it } from "vitest";
import { fabricFormSchema } from "@/lib/admin/schemas/fabric";

describe("fabricFormSchema", () => {
  const validInput = {
    id: "abarth-26",
    name: "Abarth 26",
    code: "26",
    category: "Fabrics",
    swatchColor: "#726A50",
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = fabricFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required id", () => {
    const input = { ...validInput, id: "" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("id"))).toBe(true);
    }
  });

  it("rejects invalid id format (uppercase)", () => {
    const input = { ...validInput, id: "Abarth-26" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid id format (double hyphen)", () => {
    const input = { ...validInput, id: "abarth--26" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const input = { ...validInput, name: "" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing code", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).code;
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const input = { ...validInput, code: "" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).category;
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const input = { ...validInput, category: "" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts 3-digit hex swatchColor", () => {
    const input = { ...validInput, swatchColor: "#abc" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(true); // 3-digit hex is valid per hexColorSchema
  });

  it("accepts 6-digit hex swatchColor", () => {
    const input = { ...validInput, swatchColor: "#726A50" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts 8-digit hex swatchColor (with alpha)", () => {
    const input = { ...validInput, swatchColor: "#726A50FF" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid swatchColor format (no hash)", () => {
    const input = { ...validInput, swatchColor: "726A50" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid swatchColor format (wrong chars)", () => {
    const input = { ...validInput, swatchColor: "#GGGGGG" };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = fabricFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});