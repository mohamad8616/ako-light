import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { localizedColumn } from "@/components/admin/catalog/columns";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const MATERIAL_ITEMS_TABLE = read(
  "../../../components/admin/catalog/fabrics/MaterialItemsTable.tsx",
);

/**
 * `localizedColumn` hardcodes `id: "name"` unless told otherwise, and a TanStack
 * cell's React key is `<rowId>_<columnId>` — so a table that renders TWO
 * localized columns (the material-items screen shows the item's own name AND its
 * category's localized name) used to collide on key `9_name`, `10_name`, …
 */
describe("admin table column ids", () => {
  it("localizedColumn defaults to the name column id", () => {
    expect(
      localizedColumn({ lang: "en", label: "Name", access: (row: { name: never }) => row.name }).id,
    ).toBe("name");
  });

  it("localizedColumn honors an explicit id so two localized columns stay unique", () => {
    expect(
      localizedColumn({
        id: "category",
        lang: "en",
        label: "Category",
        access: (row: { categoryName: never }) => row.categoryName,
      }).id,
    ).toBe("category");
  });

  it("the material-items table gives its category column a distinct id", () => {
    // The regression this pins: both localized columns must NOT fall back to
    // "name", or DataTable renders duplicate React keys.
    expect(MATERIAL_ITEMS_TABLE).toMatch(
      /localizedColumn\(\{\s*id:\s*"category"/,
    );
  });
});
