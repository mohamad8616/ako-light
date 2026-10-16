import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HOMEPAGE_HREF,
  HOMEPAGE_SLOT_KEYS,
  HOMEPAGE_SLOT_META,
} from "@/lib/admin/homepage";
import { adminTranslations } from "@/lib/i18n/admin-translations";
import { describe, expect, it } from "vitest";

/**
 * Part D — the homepage section registry and the single-page editor.
 *
 * The registry is what the admin page trusts: the keys address the singleton
 * rows, they are rendered top-to-bottom in the order the homepage renders its
 * banners, and their label/description keys must resolve in BOTH dictionaries
 * or the page renders raw keys.
 *
 * The page itself used to be a hub of cards linking to a `/admin/homepage/[slot]`
 * view per section. It is now ONE page — every section's form inline, in
 * registry order — so this file also pins that shape statically: the form
 * components must be wired up, in order, and the old per-slot route must be
 * gone. A hub that quietly came back, or a section that stopped being rendered,
 * is exactly the regression these assertions catch.
 */
const ROOT = process.cwd();

const PAGE = "app/[locale]/(admin)/admin/homepage/page.tsx";
const SLOT_ROUTE = "app/[locale]/(admin)/admin/homepage/[slot]/page.tsx";
const GRID = "components/admin/catalog/homepage/HomepageFeaturesGrid.tsx";

/** The form component that renders each section. */
const SECTION_FORMS = {
  hero: "HeroFeatureForm",
  "flagship-one": "FlagshipOneFeatureForm",
  video: "VideoFeatureForm",
  catalogue: "CatalogueFeatureForm",
  "home-collection": "HomeCollectionFeatureForm",
  "project-banner": "ProjectBannerFeatureForm",
  "project-dark-background": "ProjectDarkBackgroundFeatureForm",
} as const;

describe("homepage section registry", () => {
  it("knows every homepage section exactly once", () => {
    // The About and S34 hero videos are extra `hero_feature` rows, but they
    // belong to their own pages and are edited there — they are NOT homepage
    // sections.
    expect(HOMEPAGE_SLOT_KEYS).toHaveLength(7);
    expect(new Set(HOMEPAGE_SLOT_KEYS).size).toBe(HOMEPAGE_SLOT_KEYS.length);
    expect([...HOMEPAGE_SLOT_KEYS].sort()).toEqual(
      Object.keys(HOMEPAGE_SLOT_META).sort(),
    );
    expect(HOMEPAGE_SLOT_KEYS).not.toContain("hero-about");
    expect(HOMEPAGE_SLOT_KEYS).not.toContain("hero-s34");
  });

  it("lists the sections in the order the homepage renders them", () => {
    // The page reads top-to-bottom like the page it configures, so the registry
    // order is a contract, not an accident.
    expect([...HOMEPAGE_SLOT_KEYS]).toEqual([
      "hero",
      "flagship-one",
      "video",
      "catalogue",
      "home-collection",
      "project-banner",
      "project-dark-background",
    ]);
  });

  it("has the one homepage admin route", () => {
    expect(HOMEPAGE_HREF).toBe("/admin/homepage");
  });

  it("describes every section with keys that exist in both dictionaries", () => {
    // Section labels/descriptions are admin-only strings — read them from the
    // admin dictionary, not the public barrel (see lib/i18n/admin-translations.ts).
    for (const [slot, meta] of Object.entries(HOMEPAGE_SLOT_META)) {
      expect(adminTranslations.en, slot).toHaveProperty(meta.labelKey);
      expect(adminTranslations.fa, slot).toHaveProperty(meta.labelKey);
      expect(adminTranslations.en, slot).toHaveProperty(meta.descriptionKey);
      expect(adminTranslations.fa, slot).toHaveProperty(meta.descriptionKey);
    }
  });
});

describe("the homepage editor renders every section on ONE page", () => {
  const page = readFileSync(join(ROOT, PAGE), "utf8");

  it("drives the sections off the registry, in registry order", () => {
    expect(page).toContain("HOMEPAGE_SLOT_KEYS.map");
  });

  it("wires up a form for every section", () => {
    for (const slot of HOMEPAGE_SLOT_KEYS) {
      // JSX usage, not the import — the imports are alphabetised, the RENDER
      // order is the contract asserted below.
      expect(page, slot).toContain(`<${SECTION_FORMS[slot]}`);
    }
  });

  it("renders the forms in the order the registry declares", () => {
    const positions = HOMEPAGE_SLOT_KEYS.map((slot) => {
      const index = page.indexOf(`<${SECTION_FORMS[slot]}`);
      expect(index, `${slot} form is missing`).toBeGreaterThan(-1);
      return index;
    });
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it("no longer renders the hub card grid", () => {
    expect(page).not.toContain("HomepageFeaturesGrid");
    expect(existsSync(join(ROOT, GRID))).toBe(false);
  });

  it("no longer has a per-slot edit route", () => {
    expect(existsSync(join(ROOT, SLOT_ROUTE))).toBe(false);
  });
});
