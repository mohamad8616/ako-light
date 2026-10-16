import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The homepage category tiles — the ONLY caller that feeds `category` to
 * ImageGalleryCarousel (every other page passes plain `images`).
 *
 * WHAT THIS PINS
 *
 * The tiles used to carry `name: category.i18nKey` — the derived translation
 * KEY — while the row's own bilingual `name` column was dropped on the floor.
 * Slide and MobileColumn then fed that string into `t()`, and because `t()`
 * returns the RAW KEY on a dictionary miss, a newly added category rendered
 * literally "products.car" — in BOTH languages — on the tile, in the image
 * `alt` and in `aria-label`.
 *
 * The fix spans four files and only works when ALL of them agree:
 *  - the page passes `i18nKey` AND `name` (never the key AS the name);
 *  - the slides resolve the label with `displayCategoryName`
 *    (dictionary-first, the row's own name as fallback — the same resolver the
 *    category page and the collection section use), never with a bare
 *    `t(cta.name)`.
 *
 * Static source assertions, not rendered-DOM ones: every vitest project here is
 * `environment: "node"` (see vitest.config).
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const HOMEPAGE = read("../../../app/[locale]/(site)/page.tsx");
const SLIDE = read("../../../components/ui/imageGalleryCarousel/Slide.tsx");
const MOBILE = read(
  "../../../components/ui/imageGalleryCarousel/MobileColumn.tsx",
);

describe("homepage category tiles — the label is the category's name, not its key", () => {
  it("the page hands the tile BOTH the key and the real name", () => {
    expect(HOMEPAGE).toMatch(/i18nKey:\s*category\.i18nKey,/);
    expect(HOMEPAGE).toMatch(/name:\s*category\.name,/);
  });

  it("the page never passes the KEY as the tile's name", () => {
    // The original bug, in one line: the tile carried the translation key
    // where its display name belonged.
    expect(HOMEPAGE).not.toMatch(/name:\s*category\.i18nKey/);
  });

  it("the desktop slide resolves through displayCategoryName, not bare t()", () => {
    expect(SLIDE).toMatch(/displayCategoryName\(t,\s*cta,\s*lang\)/);
    expect(SLIDE).not.toMatch(/t\(cta\.name\)/);
  });

  it("the mobile column resolves through displayCategoryName, not bare t()", () => {
    expect(MOBILE).toMatch(/displayCategoryName\(t,\s*cta,\s*lang\)/);
    expect(MOBILE).not.toMatch(/t\(cta\.name\)/);
  });

  it("the label is resolved at BOTH render sites per component", () => {
    // Image `alt`/`aria-label` AND the PlusTextBtn CTA text — two sites in
    // Slide, two in MobileColumn. A partial fix would leave the raw key
    // leaking through the other site.
    expect(SLIDE.match(/displayCategoryName\(t,\s*cta,\s*lang\)/g)).toHaveLength(
      2,
    );
    expect(
      MOBILE.match(/displayCategoryName\(t,\s*cta,\s*lang\)/g),
    ).toHaveLength(2);
  });
});
