import { describe, expect, it } from "vitest";
import {
  catalogueCreateFormSchema,
  catalogueFormSchema,
} from "@/lib/admin/schemas/catalogue";

describe("catalogueFormSchema", () => {
  const validInput = {
    id: "s34-5",
    title: "S34/5",
    pdfUrl: "https://storage.example.com/media/catalogue/s34-5.pdf",
    pdfName: "S34-5.pdf",
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

  it("ignores a legacy href: the download is an uploaded document now", () => {
    const input = { ...validInput, href: "https://example.com/legacy.pdf" };
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

  it("accepts a PowerPoint document", () => {
    const input = {
      ...validInput,
      pdfUrl: "https://storage.example.com/media/catalogue/deck.pptx",
      pdfName: "deck.pptx",
    };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts an empty document on edit (a row not yet replaced)", () => {
    const input = { ...validInput, pdfUrl: "", pdfName: "" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a document URL that does not end in .pdf or .pptx", () => {
    const input = {
      ...validInput,
      pdfUrl: "https://storage.example.com/media/catalogue/notes.docx",
    };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects the OLD storage-key shape, where the random suffix hid the extension", () => {
    // REGRESSION. The provider's `addRandomSuffix` appends its suffix to the
    // WHOLE key — after the extension — so an upload used to store
    // `…/catalogue.pdf-a1b2c3d4`. That URL failed this very rule, which blocked
    // Save in the browser: react-hook-form never called the action, and the
    // dialog had no invalid handler, so the button looked dead. The upload
    // action now keeps the extension LAST (`documentStorageKey`); this case
    // pins the shape that must never come back.
    const input = {
      ...validInput,
      pdfUrl:
        "https://storage.example.com/media/catalogue/1-henge-catalogue.pdf-a1b2c3d4e5f6",
    };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts the key shape the upload action actually produces", () => {
    const input = {
      ...validInput,
      pdfUrl:
        "https://storage.example.com/media/catalogue/1792139957847-henge-catalogue-a1b2c3d4e5f6.pdf",
      pdfName: "henge-catalogue.pdf",
    };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a document URL that is not a link at all", () => {
    const input = { ...validInput, pdfUrl: "not-a-link.pdf" };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a filename that would break the Content-Disposition header", () => {
    const input = { ...validInput, pdfName: 'evil"name.pdf' };
    const result = catalogueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("requires an uploaded document when creating a card", () => {
    const input = { ...validInput, pdfUrl: "", pdfName: "" };
    const result = catalogueCreateFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts a complete document when creating a card", () => {
    const result = catalogueCreateFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
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