/**
 * Admin server-action result contract (lib/admin/result.ts) — the pure logic
 * every admin action uses to turn zod failures into structured, translatable
 * field issues (no prose ever crosses the wire).
 */
import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/lib/admin/schemas/product";
import {
  actionFail,
  actionOk,
  errorCodeForType,
  zodIssuesToFieldIssues,
} from "@/lib/admin/result";

const validProduct = {
  slug: "test-result-product",
  name: { en: "Test Product", fa: "محصول تست" },
  hoverImage: "/hover.jpg",
  heroImage: "/hero.jpg",
  price: 10,
  existsInStore: true,
  quantity: 1,
  description: { en: "Description", fa: "توضیحات" },
  moreInfo: null,
  downloads: [],
  related: [],
  sortOrder: 0,
  categoryId: "lighting",
  designerId: null,
  images: [],
};

/** Runs the real form schema and maps its failure through the action mapping. */
function mapFailure(input: unknown) {
  const parsed = productFormSchema.safeParse(input);
  if (parsed.success) throw new Error("expected the payload to fail validation");
  return zodIssuesToFieldIssues(parsed.error);
}

describe("actionOk / actionFail", () => {
  it("actionOk wraps data in a success result", () => {
    expect(actionOk("row-1")).toEqual({ ok: true, data: "row-1" });
  });

  it("actionFail defaults to an empty issue list", () => {
    expect(actionFail("unknown")).toEqual({
      ok: false,
      formError: "unknown",
      issues: [],
    });
  });

  it("actionFail carries the structured field issues it was given", () => {
    expect(actionFail("slugTaken", [{ field: "slug", code: "slugTaken" }])).toEqual({
      ok: false,
      formError: "slugTaken",
      issues: [{ field: "slug", code: "slugTaken" }],
    });
  });
});

describe("errorCodeForType", () => {
  it("maps client-side RHF issue types to dictionary codes", () => {
    expect(errorCodeForType("invalid_type")).toBe("required");
    expect(errorCodeForType("too_small")).toBe("required");
    expect(errorCodeForType("invalid_format")).toBe("invalid");
    expect(errorCodeForType("custom")).toBe("invalid");
    expect(errorCodeForType(undefined)).toBe("invalid");
  });
});

describe("zodIssuesToFieldIssues", () => {
  it("accepts the baseline fixture (mutations below are the only failures)", () => {
    expect(productFormSchema.safeParse(validProduct).success).toBe(true);
  });

  it("maps a fully-empty payload to one required issue per top-level field", () => {
    const issues = mapFailure({});
    expect(issues).toHaveLength(Object.keys(validProduct).length);
    expect(issues.every((issue) => issue.code === "required")).toBe(true);
    expect(issues.map((issue) => issue.field)).toContain("slug");
    expect(issues.map((issue) => issue.field)).toContain("price");
  });

  it("addresses nested fields with a dotted form path", () => {
    const issues = mapFailure({ ...validProduct, name: { en: "", fa: "تست" } });
    expect(issues).toEqual([{ field: "name.en", code: "required" }]);
  });

  it("collapses multiple zod issues on one field into a single field issue", () => {
    // "" fails .min(1) (too_small) AND the slug regex (invalid_format); the
    // field must keep the stronger "required" code and appear only once.
    const issues = mapFailure({ ...validProduct, slug: "" });
    expect(issues).toEqual([{ field: "slug", code: "required" }]);
  });

  it("keeps a failed range check on a number as invalid, not required", () => {
    // price: -1 is too_small with a NUMBER origin — the value exists, it is
    // just out of range, so it maps to "invalid".
    const issues = mapFailure({ ...validProduct, price: -1 });
    expect(issues).toEqual([{ field: "price", code: "invalid" }]);
  });

  it("treats a wrong-typed value as required", () => {
    const issues = mapFailure({ ...validProduct, price: "10" });
    expect(issues).toEqual([{ field: "price", code: "required" }]);
  });
});
