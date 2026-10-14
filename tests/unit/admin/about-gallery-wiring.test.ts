import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The `/about` image gallery is operator-editable.
 *
 * WHAT THIS PINS
 *
 * The gallery used to be a hardcoded list in `lib/data/about.ts`. It is now an
 * `AboutPageSection` row (`gallerySection`) that the dashboard edits and the
 * public page renders — an ordered, unbounded list of photos that belongs to no
 * project, product or collection, which is exactly why it is a page section
 * rather than a relation.
 *
 * The wiring spans six files and only works when ALL of them agree, so each leg
 * is asserted here. Static source assertions, not rendered-DOM ones: every
 * vitest project here is `environment: "node"` (see vitest.config).
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const ABOUT_FORMS = read(
  "../../../components/admin/catalog/page-sections/AboutSectionForms.tsx",
);
const ADMIN_ABOUT_PAGE = read(
  "../../../app/[locale]/(admin)/admin/about/page.tsx",
);
const SITE_ABOUT_PAGE = read("../../../app/[locale]/(site)/about/page.tsx");
const REPOSITORY = read("../../../lib/repositories/about-page.ts");
const SCHEMAS = read("../../../lib/admin/schemas/about.ts");
const ACTION = read("../../../lib/admin/actions/about.ts");
const SEED = read("../../../prisma/seed.ts");
const CAROUSEL = read(
  "../../../components/ui/imageGalleryCarousel/ImageGalleryCarousel.tsx",
);

describe("about gallery — the admin can edit it", () => {
  it("the dashboard renders a form for the section", () => {
    expect(ADMIN_ABOUT_PAGE).toMatch(
      /<AboutGallerySectionForm\s+content=\{content\.gallery\}/,
    );
  });

  it("the form is an ordered, upload-aware image list — not a textarea of URLs", () => {
    expect(ABOUT_FORMS).toMatch(
      /export function AboutGallerySectionForm\(\{[\s\S]*?\}: \{\s*content: AboutGalleryContent;/,
    );
    expect(ABOUT_FORMS).toMatch(/<ImageListField\b/);
    // The field path has to be `images` — that is the stored shape.
    expect(ABOUT_FORMS).toMatch(/<ImageListField[\s\S]{0,200}?name="images"/);
    expect(ABOUT_FORMS).toMatch(/folder="about"/);
  });

  it("the form saves through the shared section action under its own key", () => {
    expect(ABOUT_FORMS).toMatch(
      /updateAboutPageSectionAction\("gallerySection", values\)/,
    );
  });

  it("a rejected save is announced instead of looking like a dead button", () => {
    // A client-side validation stop never calls the action, so without
    // `notifyInvalid` there is no request, no pending state and no toast.
    expect(ABOUT_FORMS).toMatch(/\}, notifyInvalid\);/);
  });
});

describe("about gallery — the public page renders the stored list", () => {
  it("feeds the carousel from the section row, not the static asset module", () => {
    expect(SITE_ABOUT_PAGE).toMatch(/images=\{content\.gallery\.images\}/);
    expect(
      SITE_ABOUT_PAGE,
      "the hardcoded list must no longer be read by the page",
    ).not.toMatch(/getAboutGalleryImages\(\)/);
  });

  it("renders NOTHING for an empty list rather than an empty frame", () => {
    // "It does not matter how many photos are chosen" — including none.
    expect(CAROUSEL).toMatch(/itemCount === 0\)\s*return null/);
  });
});

describe("about gallery — the row is a first-class section", () => {
  it("is a registered key, in render order, before elegance", () => {
    expect(REPOSITORY).toMatch(/ABOUT_SECTION_KEYS\s*=\s*\[[\s\S]*?"gallerySection"[\s\S]*?\]/);
    expect(REPOSITORY).toMatch(/gallerySection:\s*3,/);
    expect(REPOSITORY).toMatch(/eleganceSection:\s*4,/);
  });

  it("has a content type, a default and a resolver entry", () => {
    expect(REPOSITORY).toMatch(/export type AboutGalleryContent = \{[\s\S]*?images: string\[\];/);
    expect(REPOSITORY).toMatch(/gallery: resolveSection\(/);
    // The default is the seeded placeholder list, so a fresh database still
    // paints a gallery; once saved, the stored list wins outright.
    expect(REPOSITORY).toMatch(/images: getAboutGalleryImages\(\)/);
  });

  it("is registered in the schema map, which is what the action validates against", () => {
    expect(SCHEMAS).toMatch(/gallerySection: aboutGallerySectionSchema/);
  });

  it("is reachable through the generic section action (no special case needed)", () => {
    // The action keys off the registry, so registering the schema is the whole
    // change — an unknown key still fails closed.
    expect(ACTION).toMatch(/aboutSectionSchemas\[sectionKey\]\.safeParse/);
    expect(ACTION).toMatch(/isAboutSectionKey/);
  });

  it("is seeded so the row exists out of the box", () => {
    expect(SEED).toMatch(/"gallerySection",\s*3,/);
  });
});
