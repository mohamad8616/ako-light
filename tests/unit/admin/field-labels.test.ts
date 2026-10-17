import { describe, expect, it } from "vitest";
import {
  formFillIssueLabelKeys,
  formatFieldLabelList,
  invalidFieldPaths,
  labelKeyForFieldPath,
  labelKeysForFormErrors,
} from "@/lib/admin/field-labels";

/**
 * The registry that lets a blocked save NAME its fields. These assertions pin
 * the two behaviours the toast depends on: longest-prefix matching (so
 * "description.p1" beats "description") and ignoring array indices (so
 * "images.0.url" resolves like "images").
 */
describe("labelKeyForFieldPath", () => {
  it("resolves a plain field path", () => {
    expect(labelKeyForFieldPath("name")).toBe("admin.product.field.name");
    expect(labelKeyForFieldPath("slug")).toBe("admin.product.field.slug");
    expect(labelKeyForFieldPath("gallery")).toBe(
      "admin.collection.field.gallery",
    );
    expect(labelKeyForFieldPath("usedProducts")).toBe(
      "admin.collection.field.productsUsed",
    );
  });

  it("trims a localized half to its field", () => {
    expect(labelKeyForFieldPath("name.en")).toBe("admin.product.field.name");
    expect(labelKeyForFieldPath("name.fa")).toBe("admin.product.field.name");
  });

  it("prefers the LONGEST matching prefix", () => {
    // "description.p1" is registered; "description" is too.
    expect(labelKeyForFieldPath("description.p1.en")).toBe(
      "admin.collection.field.descriptionP1",
    );
    expect(labelKeyForFieldPath("description.en")).toBe(
      "admin.product.field.description",
    );
  });

  it("ignores array indices", () => {
    expect(labelKeyForFieldPath("images.0.url")).toBe(
      "admin.product.field.images",
    );
    expect(labelKeyForFieldPath("related.2.name.en")).toBe(
      "admin.product.field.related",
    );
  });

  it("returns undefined for an unknown path", () => {
    expect(labelKeyForFieldPath("someOtherField")).toBeUndefined();
  });
});

describe("invalidFieldPaths", () => {
  it("collects every leaf path from a react-hook-form error tree", () => {
    const errors = {
      name: { en: { type: "too_small" }, fa: { type: "too_small" } },
      description: { p1: { en: { type: "too_small" } } },
      gallery: { type: "tooFewImages" },
      images: { 0: { url: { type: "too_small" } } },
      root: { type: "someFormError" },
    };

    expect(invalidFieldPaths(errors).sort()).toEqual(
      [
        "description.p1.en",
        "gallery",
        "images.0.url",
        "name.en",
        "name.fa",
      ].sort(),
    );
  });

  it("returns nothing for a valid form", () => {
    expect(invalidFieldPaths({})).toEqual([]);
    expect(invalidFieldPaths(undefined)).toEqual([]);
  });
});

describe("labelKeysForFormErrors", () => {
  it("dedupes by label — two localized halves are one field", () => {
    const errors = {
      name: { en: { type: "too_small" }, fa: { type: "too_small" } },
      gallery: { type: "tooFewImages" },
    };

    expect(labelKeysForFormErrors(errors)).toEqual([
      "admin.product.field.name",
      "admin.collection.field.gallery",
    ]);
  });

  it("skips paths no label covers", () => {
    const errors = { unknownField: { type: "too_small" } };
    expect(labelKeysForFormErrors(errors)).toEqual([]);
  });
});

describe("formFillIssueLabelKeys", () => {
  it("maps schema-level issues to their labels", () => {
    expect(
      formFillIssueLabelKeys([
        { field: "name.en", code: "required" },
        { field: "gallery", code: "tooFewImages" },
      ]),
    ).toEqual(["admin.product.field.name", "admin.collection.field.gallery"]);
  });

  it("returns nothing when a server-born code is present", () => {
    // "This handle is already in use." is a better message than a field list,
    // so the caller must fall back to the specific code.
    expect(
      formFillIssueLabelKeys([{ field: "slug", code: "slugTaken" }]),
    ).toEqual([]);
  });
});

describe("formatFieldLabelList", () => {
  const t = (key: string) => `[${key}]`;

  it("joins with the English comma", () => {
    expect(formatFieldLabelList(t, ["a", "b"], "en")).toBe("[a], [b]");
  });

  it("joins with the Persian comma", () => {
    expect(formatFieldLabelList(t, ["a", "b"], "fa")).toBe("[a]، [b]");
  });
});
