/**
 * Shared zod primitives (lib/admin/schemas/common.ts) — the rules every form
 * schema composes from. Each primitive: valid pass cases, then invalid cases
 * asserted with the exact zod v4 issue code the admin result mapping keys on
 * (lib/admin/result.ts maps issue codes to dictionary keys, never prose).
 */
import { describe, expect, it } from "vitest";
import {
  hexColorSchema,
  imageRefSchema,
  linkSchema,
  localizedListSchema,
  localizedSchema,
  mixedLocalizedSchema,
  nonEmptySchema,
  slugSchema,
  sortOrderSchema,
} from "@/lib/admin/schemas/common";

describe("localizedSchema", () => {
  it("accepts a non-empty { en, fa } pair", () => {
    expect(localizedSchema.safeParse({ en: "Hello", fa: "سلام" }).success).toBe(true);
  });

  it("rejects a missing fa key as invalid_type on path fa", () => {
    const result = localizedSchema.safeParse({ en: "Hello" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
      expect(result.error.issues[0].path).toEqual(["fa"]);
    }
  });

  it("rejects an empty en string as too_small on path en", () => {
    const result = localizedSchema.safeParse({ en: "", fa: "سلام" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_small");
      expect(result.error.issues[0].path).toEqual(["en"]);
    }
  });

  it("rejects a wrong-typed en value as invalid_type", () => {
    const result = localizedSchema.safeParse({ en: 123, fa: "سلام" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
      expect(result.error.issues[0].path).toEqual(["en"]);
    }
  });

  it("rejects a plain string instead of the pair", () => {
    expect(localizedSchema.safeParse("Hello").success).toBe(false);
  });
});

describe("localizedListSchema", () => {
  const pair = { en: "Hello", fa: "سلام" };

  it("accepts an empty list", () => {
    expect(localizedListSchema.safeParse([]).success).toBe(true);
  });

  it("accepts a list of pairs", () => {
    expect(localizedListSchema.safeParse([pair, pair]).success).toBe(true);
  });

  it("rejects a non-array", () => {
    expect(localizedListSchema.safeParse(pair).success).toBe(false);
  });

  it("rejects an entry that is not a localized pair", () => {
    expect(localizedListSchema.safeParse(["plain"]).success).toBe(false);
  });

  it("rejects an entry with an empty language", () => {
    const result = localizedListSchema.safeParse([{ en: "", fa: "سلام" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_small");
      expect(result.error.issues[0].path).toEqual([0, "en"]);
    }
  });
});

describe("mixedLocalizedSchema", () => {
  it("accepts a localized pair", () => {
    expect(mixedLocalizedSchema.safeParse({ en: "Hello", fa: "سلام" }).success).toBe(true);
  });

  it("accepts a non-empty plain string", () => {
    expect(mixedLocalizedSchema.safeParse("Via della Spiga, 34").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(mixedLocalizedSchema.safeParse("").success).toBe(false);
  });

  it("rejects a non-string non-object entry", () => {
    expect(mixedLocalizedSchema.safeParse(42).success).toBe(false);
  });
});

describe("slugSchema", () => {
  it("accepts a canonical slug", () => {
    expect(slugSchema.safeParse("ariane-pendant-lamp").success).toBe(true);
    expect(slugSchema.safeParse("s34-5").success).toBe(true);
  });

  it("rejects the empty string with too_small then invalid_format", () => {
    const result = slugSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual([
        "too_small",
        "invalid_format",
      ]);
    }
  });

  it("rejects uppercase characters as invalid_format", () => {
    const result = slugSchema.safeParse("Test-Product");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects doubled hyphens as invalid_format", () => {
    const result = slugSchema.safeParse("test--product");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects inner spaces as invalid_format", () => {
    const result = slugSchema.safeParse("test product");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects a non-string value as invalid_type", () => {
    const result = slugSchema.safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
    }
  });
});

describe("linkSchema", () => {
  it("accepts https, http, root-relative and # placeholder links", () => {
    expect(linkSchema.safeParse("https://example.com/x.pdf").success).toBe(true);
    expect(linkSchema.safeParse("http://example.com").success).toBe(true);
    expect(linkSchema.safeParse("/designers/massimo-castagna").success).toBe(true);
    expect(linkSchema.safeParse("#").success).toBe(true);
  });

  it("rejects the empty string with too_small then custom", () => {
    const result = linkSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["too_small", "custom"]);
    }
  });

  it("rejects a scheme-less URL as custom", () => {
    const result = linkSchema.safeParse("example.com/x.pdf");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["custom"]);
    }
  });

  it("rejects a non-http scheme as custom", () => {
    const result = linkSchema.safeParse("ftp://example.com");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["custom"]);
    }
  });
});

describe("imageRefSchema", () => {
  it("accepts absolute https and root-relative references", () => {
    expect(imageRefSchema.safeParse("https://picsum.photos/seed/x/900/1000").success).toBe(true);
    expect(imageRefSchema.safeParse("/images/hero.jpg").success).toBe(true);
  });

  it("rejects the empty string with too_small then custom", () => {
    const result = imageRefSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["too_small", "custom"]);
    }
  });

  it("rejects the # placeholder (a link-valid value, not an image)", () => {
    const result = imageRefSchema.safeParse("#");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["custom"]);
    }
  });

  it("rejects a bare relative filename", () => {
    expect(imageRefSchema.safeParse("images/hero.jpg").success).toBe(false);
  });
});

describe("hexColorSchema", () => {
  it("accepts 3, 6 and 8 digit hex colors with #", () => {
    expect(hexColorSchema.safeParse("#abc").success).toBe(true);
    expect(hexColorSchema.safeParse("#726A50").success).toBe(true);
    expect(hexColorSchema.safeParse("#3a3530FF").success).toBe(true);
  });

  it("rejects a missing # prefix as invalid_format", () => {
    const result = hexColorSchema.safeParse("726A50");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects a 4-digit body as invalid_format", () => {
    const result = hexColorSchema.safeParse("#abcd");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects non-hex characters as invalid_format", () => {
    const result = hexColorSchema.safeParse("#GGGGGG");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.code)).toEqual(["invalid_format"]);
    }
  });

  it("rejects a non-string value as invalid_type", () => {
    expect(hexColorSchema.safeParse(123).success).toBe(false);
  });
});

describe("sortOrderSchema", () => {
  it("accepts zero and positive integers", () => {
    expect(sortOrderSchema.safeParse(0).success).toBe(true);
    expect(sortOrderSchema.safeParse(7).success).toBe(true);
  });

  it("rejects negatives as too_small with a number origin", () => {
    const result = sortOrderSchema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.code).toBe("too_small");
      expect("origin" in issue && issue.origin).toBe("number");
    }
  });

  it("rejects non-integers as invalid_type", () => {
    const result = sortOrderSchema.safeParse(1.5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
    }
  });

  it("rejects numeric strings as invalid_type (no coercion, by design)", () => {
    const result = sortOrderSchema.safeParse("1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
    }
  });
});

describe("nonEmptySchema", () => {
  it("accepts any non-empty string", () => {
    expect(nonEmptySchema.safeParse("products.coffeeTables").success).toBe(true);
  });

  it("rejects the empty string as too_small", () => {
    const result = nonEmptySchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_small");
    }
  });

  it("rejects a non-string value as invalid_type", () => {
    const result = nonEmptySchema.safeParse(42);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe("invalid_type");
    }
  });
});


