import { describe, expect, it } from "vitest";
import { projectFormSchema } from "@/lib/admin/schemas/project";

describe("projectFormSchema", () => {
  const validInput = {
    slug: "h-istra",
    name: { en: "H Istra", fa: "اچ ایستر" },
    location: "Istra, Croatia",
    year: "2026",
    image: "/images/project.jpg",
    description: { en: "Description", fa: "توضیحات" },
    paragraph: { en: "Paragraph", fa: "پاراگراف" },
    moreDescription: [{ en: "More 1", fa: "بیشتر 1" }, { en: "More 2", fa: "بیشتر 2" }],
    credits: [{ en: "Credit 1", fa: "اعتبار 1" }, { en: "Credit 2", fa: "اعتبار 2" }],
    portfolioImages: ["/images/portfolio1.jpg", "/images/portfolio2.jpg"],
    textImageUrl: "",
    textImageText: { en: "", fa: "" },
    fullImageUrl: "",
    fullImageCaption: { en: "", fa: "" },
    sortOrder: 0,
    productIds: ["pendant-light", "sofa"],
  };

  it("accepts valid input", () => {
    const result = projectFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "H-Istra" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("does not take an i18nKey — the server owns it", () => {
    // `i18nKey` is a leftover from the dictionary era and nothing reads it, so
    // the form stopped asking. A client that still sends one must not be able to
    // set it either: zod strips the unknown key, which is what keeps the value
    // server-owned (`withI18nKey` in lib/admin/actions/projects.ts).
    const result = projectFormSchema.safeParse({
      ...validInput,
      i18nKey: "projects.injected",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("i18nKey");
    }
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects name with empty en", () => {
    const input = { ...validInput, name: { en: "", fa: "ایستر" } };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing location", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).location;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty location", () => {
    const input = { ...validInput, location: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing year", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).year;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty year", () => {
    const input = { ...validInput, year: "" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).description;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing paragraph", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).paragraph;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing moreDescription", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).moreDescription;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects moreDescription with empty en", () => {
    const input = { ...validInput, moreDescription: [{ en: "", fa: "بیشتر 1" }] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing credits", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).credits;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts credits as complete EN/FA pairs", () => {
    const input = { ...validInput, credits: [{ en: "Credit", fa: "اعتبار" }] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a plain-string credit — the form always edits a pair", () => {
    // Credits used to allow a bare string shared across both languages. The
    // admin now shows two inputs per line, and the repository widens a legacy
    // string into a pair on READ, so the write shape is pairs only.
    const input = { ...validInput, credits: ["Plain string"] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a half-translated credit pair", () => {
    const input = { ...validInput, credits: [{ en: "Credit", fa: "" }] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join(".")).toBe("credits.0.fa");
    }
  });

  it("accepts an EMPTY credits list", () => {
    const input = { ...validInput, credits: [] };
    expect(projectFormSchema.safeParse(input).success).toBe(true);
  });

  it("accepts cleared portfolio-section overrides — empty means 'use the fallback'", () => {
    const result = projectFormSchema.safeParse({
      ...validInput,
      textImageUrl: "",
      textImageText: { en: "", fa: "" },
      fullImageUrl: "",
      fullImageCaption: { en: "", fa: "" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a filled portfolio-section override", () => {
    const result = projectFormSchema.safeParse({
      ...validInput,
      textImageUrl: "/images/section.jpg",
      textImageText: { en: "Text", fa: "متن" },
      fullImageUrl: "https://example.com/wide.jpg",
      fullImageCaption: { en: "Caption", fa: "توضیح" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a half-translated section caption", () => {
    // Both halves or neither — a half pair would render a BLANK line on the
    // Persian page rather than falling back to English.
    const result = projectFormSchema.safeParse({
      ...validInput,
      fullImageCaption: { en: "Caption", fa: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join(".")).toBe(
        "fullImageCaption.fa",
      );
    }
  });

  it("rejects missing portfolioImages", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).portfolioImages;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects portfolioImages with invalid format", () => {
    const input = { ...validInput, portfolioImages: ["invalid"] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("drops a blank gallery row — a photo row added but not yet filled", () => {
    // `ImageListField` appends "" when the operator clicks "add". That row is
    // not a photo yet, so it must neither block the save nor reach the database.
    const input = {
      ...validInput,
      portfolioImages: ["/images/a.jpg", "", "/images/b.jpg"],
    };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portfolioImages).toEqual([
        "/images/a.jpg",
        "/images/b.jpg",
      ]);
    }
  });

  it("accepts an EMPTY gallery — the list is unbounded in both directions", () => {
    const result = projectFormSchema.safeParse({
      ...validInput,
      portfolioImages: [],
    });
    expect(result.success).toBe(true);
  });

  it("still reports a malformed gallery entry on its own row", () => {
    // The blank-row tolerance must not swallow a genuine typo: the transform
    // runs AFTER the URL check, so the issue keeps its `portfolioImages.N` path.
    const result = projectFormSchema.safeParse({
      ...validInput,
      portfolioImages: ["/images/a.jpg", "not-a-url"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join(".")).toBe("portfolioImages.1");
    }
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing productIds", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).productIds;
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts empty productIds array", () => {
    const input = { ...validInput, productIds: [] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects productIds with empty string", () => {
    const input = { ...validInput, productIds: [""] };
    const result = projectFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});