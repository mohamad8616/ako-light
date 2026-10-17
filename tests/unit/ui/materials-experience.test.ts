import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isMaterialItemPubliclyReady } from "@/lib/data/material-item-readiness";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const ITEM_GRID = read("../../../components/materials/material/MaterialItemsGrid.tsx");
const MATERIAL_PAGE = read("../../../app/[locale]/(site)/materials/page.tsx");
const CATEGORY_PAGE = read("../../../app/[locale]/(site)/materials/[material]/page.tsx");

describe("materials catalog experience", () => {
  it("does not expose incomplete items publicly", () => {
    expect(isMaterialItemPubliclyReady({ name: { en: "Item 1", fa: "" }, image: null })).toBe(false);
    expect(isMaterialItemPubliclyReady({ name: { en: "Item 1", fa: "آیتم ۱" }, image: null })).toBe(false);
    expect(isMaterialItemPubliclyReady({ name: { en: "Item 1", fa: "آیتم ۱" }, image: "/item.jpg" })).toBe(true);
  });

  it("uses database categories for the index and resolves category detail pages", () => {
    expect(MATERIAL_PAGE).toContain("getMaterialCategories()");
    expect(MATERIAL_PAGE).toContain("<MaterialsList categories={categories}");
    expect(CATEGORY_PAGE).toContain("getMaterialCategory(slug)");
    expect(CATEGORY_PAGE).toContain("getMaterialItems(category.id)");
    expect(CATEGORY_PAGE).toContain("notFound()");
  });

  it("renders material items as non-interactive image/name cards", () => {
    expect(ITEM_GRID).toContain("<article");
    expect(ITEM_GRID).toContain("<Image");
    expect(ITEM_GRID).toContain("pick(item.name, lang)");
    expect(ITEM_GRID).not.toMatch(/import Link from/);
    expect(ITEM_GRID).not.toMatch(/<Link\b/);
  });
});
