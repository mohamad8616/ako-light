import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * A project's `i18nKey` is DERIVED, never typed.
 *
 * WHAT THIS PINS
 *
 * `i18nKey` is a leftover from when a project's copy lived in the translation
 * dictionary under `projects.<key>.*`. Since the copy moved into real columns
 * (`name`, `description`, `paragraph`, …) NOTHING reads it: the public page and
 * every component render the columns, and `lib/i18n/translations/projects.ts`
 * has no `projects.<key>.*` entries at all. So the admin stopped asking for it
 * and the server action derives it instead.
 *
 * The column is still NOT NULL, so a value must be written — which is the part
 * that can silently break: an update that forgets to carry the old value
 * through would blank a NOT NULL column, or churn it on every save.
 *
 * ── And the guard on the OTHER model ────────────────────────────────────────
 *
 * `ProductCategory` ALSO has an `i18nKey`, and that one IS read: the product
 * pages and the collection section translate a category's name through it
 * (`dict[category.i18nKey]`). `i18nKeySchema` is shared by both models, so the
 * last two tests here assert the category's half is untouched — removing the
 * project's field must not take the shared schema with it.
 */

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Source with comments removed.
 *
 * Load-bearing: these files DOCUMENT the very field they no longer have (the
 * schema explains why `i18nKey` is absent), so a raw substring search would
 * match the prose and report a failure on correct code. `\r\n` is normalised
 * first because `\r` is a line terminator for `.`, which is how the sibling
 * dialog-contract test stayed red on a correct component.
 */
function stripComments(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const read = (relative: string) => stripComments(readFileSync(join(here, relative), "utf8"));

const FORM = read("../../../components/admin/catalog/projects/ProjectForm.tsx");
const SCHEMA = read("../../../lib/admin/schemas/project.ts");
const ACTION = read("../../../lib/admin/actions/projects.ts");
const PROJECT_DICT = read(
  "../../../lib/i18n/translations/admin/project.ts",
);
const CATEGORY_DICT = read(
  "../../../lib/i18n/translations/admin/productCategory.ts",
);
const COMMON = read("../../../lib/admin/schemas/common.ts");
const CATEGORY_SCHEMA = read(
  "../../../lib/admin/schemas/product-category.ts",
);

describe("project form — the i18n key is gone", () => {
  it("does not render or default an i18nKey field", () => {
    expect(FORM).not.toMatch(/i18nKey/);
  });

  it("is not part of the form's schema", () => {
    expect(SCHEMA).not.toMatch(/i18nKey/);
  });

  it("no longer carries its dictionary label", () => {
    expect(PROJECT_DICT).not.toMatch(/admin\.project\.field\.i18nKey/);
  });
});

describe("project actions — the i18n key is derived", () => {
  it("has ONE place that supplies the value", () => {
    expect(ACTION).toMatch(/function withI18nKey\(/);
  });

  it("derives it from the slug on CREATE", () => {
    expect(ACTION).toMatch(/i18nKey: previous\?\.i18nKey \?\? `projects\.\$\{values\.slug\}`/);
    expect(ACTION).toMatch(/createProject\(withI18nKey\(parsed\.data, null\)\)/);
  });

  it("PRESERVES the stored value on UPDATE", () => {
    // Carrying the previous row through is what stops a save from blanking a
    // NOT NULL column or churning a value the form does not own.
    expect(ACTION).toMatch(
      /updateProject\(id, withI18nKey\(parsed\.data, previous\), tx\)/,
    );
    // ...and `previous` has to be read BEFORE the write for that to work.
    const previousRead = ACTION.indexOf("await getProjectAdminDetail(id)");
    const updateCall = ACTION.indexOf("withI18nKey(parsed.data, previous)");
    expect(previousRead).toBeGreaterThan(-1);
    expect(previousRead).toBeLessThan(updateCall);
  });
});

describe("product categories — the shared i18n key is untouched", () => {
  it("still declares the field and its label", () => {
    // That one IS read at runtime: `dict[category.i18nKey]` translates a
    // category's name on the product pages.
    expect(CATEGORY_SCHEMA).toMatch(/i18nKey: i18nKeySchema/);
    expect(CATEGORY_DICT).toMatch(/admin\.productCategory\.field\.i18nKey/);
  });

  it("still has the shared schema it depends on", () => {
    expect(COMMON).toMatch(/export const i18nKeySchema = z\.string\(\)/);
  });
});
