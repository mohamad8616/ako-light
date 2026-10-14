/**
 * Pass D.2 — repository tier: the two portfolio sections and credit pairs.
 *
 * WHAT THIS PINS
 *
 *   1. `Project.credits` may still hold LEGACY plain strings. The admin form
 *      edits every credit as an EN/FA pair, so the ADMIN read widens a string
 *      into `{ en: s, fa: s }` — while the PUBLIC read stays permissive, because
 *      `pick()` renders either representation. A regression here is a form that
 *      cannot load a row somebody created before the change.
 *
 *   2. The two sections under the gallery resolve OVERRIDE-THEN-FALLBACK, per
 *      field: an explicit admin value wins, a NULL column falls back to the
 *      gallery position (`portfolioImages[0]`/`[1]` with `moreDescription[0]`/
 *      `[1]`), and no photo at all means `null` so the page renders nothing
 *      (`next/image` THROWS on a missing `src`).
 *
 * `import "dotenv/config"` MUST be the first import: it is what loads
 * `DATABASE_URL`, and `lib/db/prisma.ts` reads `process.env.DATABASE_URL` ONCE
 * at module-evaluation time. With the helper imported first the pg adapter is
 * built from `undefined` and dials `localhost:5432` → ECONNREFUSED, while the
 * raw `pg` pool keeps working (it reads the env lazily) — which makes the
 * failure look like a broken repository rather than an import-order bug.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  createProject,
  getProjectAdminDetail,
  getProjectById,
  updateProject,
  type ProjectWriteInput,
} from "@/lib/repositories/projects";
import { hasDatabaseUrl, withRequestCache } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const PAIR = { en: "Text", fa: "متن" };

/** Ids created by this run, cleaned up after every test. */
const created: string[] = [];

function projectInput(overrides: Partial<ProjectWriteInput> = {}): ProjectWriteInput {
  const slug = `zz-sections-${randomUUID()}`;
  created.push(slug);

  return {
    slug,
    i18nKey: `projects.${slug}`,
    name: { en: "Sections", fa: "بخش‌ها" },
    location: "Test",
    year: "2026",
    image: "/images/main.jpg",
    description: PAIR,
    paragraph: PAIR,
    moreDescription: [
      { en: "Paragraph one", fa: "پاراگراف یک" },
      { en: "Paragraph two", fa: "پاراگراف دو" },
    ],
    credits: [{ en: "Credit", fa: "اعتبار" }],
    portfolioImages: ["/images/gallery-1.jpg", "/images/gallery-2.jpg"],
    textImageUrl: "",
    textImageText: { en: "", fa: "" },
    fullImageUrl: "",
    fullImageCaption: { en: "", fa: "" },
    sortOrder: 0,
    productIds: [],
    ...overrides,
  };
}

/** A read as its own "request", so React's `cache()` never serves a stale row. */
const readPublic = (slug: string) =>
  withRequestCache(() => getProjectById(slug));

const readAdmin = (id: string) =>
  withRequestCache(() => getProjectAdminDetail(id));

describeDb("project portfolio sections", () => {
  afterEach(async () => {
    if (created.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: created } } });
      created.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("falls back to the gallery positions when the overrides are NULL", async () => {
    const input = projectInput();
    await createProject(input);

    const project = (await readPublic(input.slug))!;

    // Both sections are still rendered — they just read the positional default,
    // which is exactly what the page did before these columns existed. That is
    // why the columns need no backfill.
    expect(project.textImageSection).toEqual({
      image: "/images/gallery-1.jpg",
      text: { en: "Paragraph one", fa: "پاراگراف یک" },
    });
    expect(project.fullImageSection).toEqual({
      image: "/images/gallery-2.jpg",
      caption: { en: "Paragraph two", fa: "پاراگراف دو" },
    });
  });

  it("lets an explicit override win, per FIELD", async () => {
    const input = projectInput();
    await createProject(input);

    await updateProject(input.slug, {
      ...input,
      textImageUrl: "/images/override.jpg",
      textImageText: { en: "Overridden", fa: "جایگزین" },
      // The caption stays cleared → still falls back.
    });

    const project = (await readPublic(input.slug))!;

    expect(project.textImageSection).toEqual({
      image: "/images/override.jpg",
      text: { en: "Overridden", fa: "جایگزین" },
    });
    expect(project.fullImageSection).toEqual({
      image: "/images/gallery-2.jpg",
      caption: { en: "Paragraph two", fa: "پاراگراف دو" },
    });
  });

  it("resolves an override with NO gallery at all", async () => {
    const input = projectInput({ portfolioImages: [] });
    await createProject(input);

    await updateProject(input.slug, {
      ...input,
      textImageUrl: "/images/only.jpg",
      textImageText: { en: "Only", fa: "تنها" },
    });

    const project = (await readPublic(input.slug))!;

    expect(project.textImageSection).toEqual({
      image: "/images/only.jpg",
      text: { en: "Only", fa: "تنها" },
    });
    // Nothing at position 1 and no override → the section is skipped, not
    // rendered with a missing `src`.
    expect(project.fullImageSection).toBeNull();
  });

  it("returns null for a section with no photo anywhere", async () => {
    const input = projectInput({ portfolioImages: [] });
    await createProject(input);

    const project = (await readPublic(input.slug))!;

    expect(project.textImageSection).toBeNull();
    expect(project.fullImageSection).toBeNull();
  });

  it("clears an override back to SQL NULL, restoring the fallback", async () => {
    const input = projectInput();
    await createProject(input);

    await updateProject(input.slug, {
      ...input,
      textImageUrl: "/images/override.jpg",
      textImageText: { en: "Overridden", fa: "جایگزین" },
    });
    await updateProject(input.slug, input);

    // The sentinel the FORM uses ("", empty pair) must land as a real NULL, or
    // the column would hold "" and `?? fallback` would never fire.
    const row = await prisma.project.findUniqueOrThrow({
      where: { id: input.slug },
      select: { textImageUrl: true, textImageText: true },
    });
    expect(row.textImageUrl).toBeNull();
    expect(row.textImageText).toBeNull();

    expect((await readPublic(input.slug))!.textImageSection).toEqual({
      image: "/images/gallery-1.jpg",
      text: { en: "Paragraph one", fa: "پاراگراف یک" },
    });
  });

  it("spells 'not configured' the way the FORM holds it", async () => {
    const input = projectInput();
    await createProject(input);

    const detail = (await readAdmin(input.slug))!;

    // A react-hook-form input always yields a value, so the form's initial
    // `values` must use "" / an empty pair rather than null.
    expect(detail.textImageUrl).toBe("");
    expect(detail.textImageText).toEqual({ en: "", fa: "" });
    expect(detail.fullImageUrl).toBe("");
    expect(detail.fullImageCaption).toEqual({ en: "", fa: "" });
  });

  it("widens a LEGACY plain-string credit into a pair for the form", async () => {
    const input = projectInput();
    await createProject(input);

    // Simulate a row written before credits became pairs — a bare string shared
    // across both languages, which is what the source data actually held.
    await prisma.$executeRaw`
      UPDATE "project" SET "credits" = '["Plain credit"]'::jsonb
      WHERE "id" = ${input.slug}
    `;

    const detail = (await readAdmin(input.slug))!;
    expect(detail.credits).toEqual([
      { en: "Plain credit", fa: "Plain credit" },
    ]);

    // The PUBLIC read stays permissive: `pick()` renders either representation,
    // so a row nobody re-saves keeps working untouched.
    const project = (await readPublic(input.slug))!;
    expect(project.credits).toEqual(["Plain credit"]);
  });

  it("persists a widened pair, so the legacy shape disappears on save", async () => {
    const input = projectInput();
    await createProject(input);

    await prisma.$executeRaw`
      UPDATE "project" SET "credits" = '["Plain credit"]'::jsonb
      WHERE "id" = ${input.slug}
    `;

    const detail = (await readAdmin(input.slug))!;
    await updateProject(input.slug, detail);

    const row = await prisma.project.findUniqueOrThrow({
      where: { id: input.slug },
      select: { credits: true },
    });
    expect(row.credits).toEqual([
      { en: "Plain credit", fa: "Plain credit" },
    ]);
  });
});
