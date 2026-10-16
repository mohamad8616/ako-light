import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Pass D.2 — the project form's three shape changes, pinned at the source.
 *
 * WHAT THIS PINS
 *
 *   1. CREDITS are an EN/FA pair per line. They used to be a mixed
 *      string-or-pair list behind a toggle, which made the ordinary case — type
 *      the credit in both languages — a two-step dance and left a plain string
 *      with no per-language editing at all.
 *   2. The PRODUCTS-USED picker is a two-step cascade (category, then product)
 *      instead of one Select over the whole catalog.
 *   3. The two sections under the gallery have their OWN photo and copy fields,
 *      rather than being read positionally out of the gallery.
 *
 * Static source assertions, not rendered-DOM ones: every vitest project here is
 * `environment: "node"` (see vitest.config). Comments are stripped before
 * matching — several of these files DOCUMENT the thing they no longer do, and a
 * raw substring search would match the prose (that mistake already cost a cycle
 * on the i18nKey contract).
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

/** Comments removed, so an assertion cannot match documentation. */
const code = (relative: string) =>
  read(relative)
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const FORM = code("../../../components/admin/catalog/projects/ProjectForm.tsx");
const FIELD = code(
  "../../../components/admin/catalog/fields/ProductsUsedField.tsx",
);
const OPTIONS = code("../../../lib/repositories/products/options.ts");

describe("project credits are an EN/FA pair per line", () => {
  it("renders a LocalizedListField, not the mixed string-or-pair field", () => {
    expect(FORM).toMatch(/<LocalizedListField\b[\s\S]{0,200}?name="credits"/);
    expect(FORM).not.toMatch(/MixedListField/);
  });
});

describe("the products-used picker is a category → product cascade", () => {
  it("renders TWO selects: the category, then the product", () => {
    const selects = FIELD.match(/<Select\b/g) ?? [];
    expect(selects.length).toBe(2);
    // The labels are i18n keys passed by the CALLER (the project form passes
    // the `admin.project.field.products*` keys); the field keeps those as its
    // defaults so the project form can omit them.
    expect(FIELD).toMatch(/categoryPlaceholderKey[\s\S]{0,120}?productsCategory/);
    expect(FIELD).toMatch(/productPlaceholderKey[\s\S]{0,120}?productsProduct/);
  });

  it("keeps the product menu shut until a category is chosen", () => {
    // "if one category selected, must another menu should be opened" — the
    // second menu is disabled while no category is picked.
    expect(FIELD).toMatch(/disabled=\{!category\}/);
  });

  it("derives the category list from the options, in their own order", () => {
    // `getProductOptions()` already orders by category sortOrder, so deriving
    // the list keeps nav order with no second query and no second source of
    // truth.
    expect(FIELD).toMatch(/seen\.has\(product\.categorySlug\)/);
    expect(FIELD).toMatch(/categorySlug/);
  });

  it("scopes the product menu to the chosen category", () => {
    expect(FIELD).toMatch(
      /product\.categorySlug === category/,
    );
  });

  it("clears the product draft when the category changes", () => {
    // Otherwise "Add" could link a product from the category the operator has
    // already navigated away from. The reset lives in the CATEGORY select's
    // handler, which sits above the trigger the aria-label is on.
    expect(FIELD).toMatch(/setCategory\([\s\S]{0,240}?setDraft\(""\)/);
  });

  it("carries the category NAME on the option, so the picker needs no extra read", () => {
    expect(OPTIONS).toMatch(/categoryName: Localized/);
    expect(OPTIONS).toMatch(/category: \{ select: \{ slug: true, name: true \} \}/);
    expect(OPTIONS).toMatch(/categoryName: asLocalized\(row\.category\.name\)/);
  });

  it("keeps the upload-add control from ever submitting the form", () => {
    // The picker lives inside the <form>; a bare <button> would submit it.
    expect(FIELD).toMatch(/type="button"/);
  });

  it("adds the picked product through the shared field — the form contract is unchanged", () => {
    // The project form still stores `productIds`, so the picker's id mode must
    // remain the write path (`toStoredRow` returns the id in "ids" mode).
    expect(FIELD).toMatch(/setValue\(name, \[\.\.\.rows, toStoredRow\(product\)\]/);
    expect(FIELD).toMatch(/mode = "ids"/);
  });
});

describe("the two gallery sections have their own photo and copy", () => {
  it("renders a media field and a localized field for each section", () => {
    for (const name of ["textImageUrl", "fullImageUrl"]) {
      expect(FORM).toMatch(
        new RegExp(`<ImageUpload[\\s\\S]{0,200}?name="${name}"`),
      );
    }
    for (const name of ["textImageText", "fullImageCaption"]) {
      expect(FORM).toMatch(
        new RegExp(`<LocalizedField[\\s\\S]{0,200}?name="${name}"`),
      );
    }
  });

  it("uses the shared media field, so the photo is uploadable", () => {
    expect(FORM).toMatch(/<ImageUpload[\s\S]{0,200}?folder="projects"/);
  });

  it("does NOT mark the section photos required — empty means 'use the fallback'", () => {
    for (const name of ["textImageUrl", "fullImageUrl"]) {
      const start = FORM.indexOf(`name="${name}"`);
      expect(start, `${name} rendered`).toBeGreaterThan(-1);
      // The whole opening tag, so the assertion cannot spill into the next field.
      const tag = FORM.slice(start, FORM.indexOf("/>", start));
      expect(tag, name).not.toMatch(/required/);
    }
  });
});
