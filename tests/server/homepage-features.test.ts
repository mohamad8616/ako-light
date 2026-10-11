/**
 * Part C — repository tier: `lib/repositories/homepage-features.ts`.
 *
 * The homepage banners moved from `lib/data/homepage.ts` to singleton feature
 * rows, so this tier covers: resolving each slot off its linked entity
 * (`reference` mode), override precedence with per-field fallback, canonical
 * CTA targets, the serializable admin DTOs, and writing a slot inside the
 * caller's transaction.
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TX_OPTIONS } from "@/tests/helpers/tx";

import { FeatureMode } from "@/generated/prisma/client";
import type { FlagshipDetail } from "@/lib/data/flagships";
import { prisma } from "@/lib/db/prisma";
import {
  CATALOGUE_CTA_DOWNLOAD_PATH,
  CATALOGUE_SLOT,
  FLAGSHIP_ONE_SLOT,
  HERO_SLOT,
  HOME_COLLECTION_HREF,
  HOME_COLLECTION_SLOT,
  PROJECT_BANNER_SLOT,
  PROJECT_DARK_BACKGROUND_SLOT,
  VIDEO_SLOT,
  getCatalogueFeature,
  getFlagshipOneFeature,
  getFlagshipOneFeatureAdminDetail,
  getHomeCollectionFeature,
  getHomepageFeaturesOverview,
  getProjectBannerFeature,
  getProjectDarkBackgroundFeature,
  updateCatalogueFeature,
  updateFlagshipOneFeature,
  updateHomeCollectionFeature,
  type FlagshipOneFeatureWriteInput,
} from "@/lib/repositories/homepage-features";
import { expectKeys, expectLocalized, hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

describeDb("homepage-features repository — reads", () => {
  beforeAll(async () => {
    // Warm the (remote) dev connection before the first timed test.
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resolves the flagship banner off its linked flagship in reference mode", async () => {
    const [data, row] = await Promise.all([
      getFlagshipOneFeature(),
      prisma.flagshipOneFeature.findUnique({
        where: { id: FLAGSHIP_ONE_SLOT },
        include: { flagship: true },
      }),
    ]);

    expect(row, "seeded flagship-one slot").not.toBeNull();
    expect(data).not.toBeNull();

    expectKeys(
      data,
      ["ctaHref", "enabled", "image", "kicker", "paragraphs", "title"],
      "ResolvedFlagshipOneFeature",
    );
    expect(data!.enabled).toBe(row!.enabled);
    // CTA always targets the linked entity's canonical route, never the
    // homepage config's former hand-written href.
    expect(data!.ctaHref).toBe(`/flagship/${row!.flagship.slug}`);
    expect(data!.title).toEqual(row!.flagship.name);
    expect(data!.kicker).toEqual(row!.flagship.city);
    // An explicit value always wins (see resolve.ts): the slot's own image when
    // it has one, otherwise the linked flagship's.
    expect(data!.image).toBe(row!.image ?? row!.flagship.image);

    // henge-paris has no built-out detail page, so it contributes no copy.
    const detail = row!.flagship.detail as FlagshipDetail | null;
    expect(data!.paragraphs).toEqual(
      row!.paragraphs ?? (detail ? [detail.description] : []),
    );
  });

  it("resolves the project banner off its linked project in reference mode", async () => {
    const [data, row] = await Promise.all([
      getProjectBannerFeature(),
      prisma.projectBannerFeature.findUnique({
        where: { id: PROJECT_BANNER_SLOT },
        include: { project: true },
      }),
    ]);

    expect(row, "seeded project-banner slot").not.toBeNull();
    expectKeys(
      data,
      ["ctaHref", "enabled", "image", "kicker", "title"],
      "ResolvedProjectBannerFeature",
    );
    expect(data!.ctaHref).toBe(`/projects/${row!.project.slug}`);
    expect(data!.title).toEqual(row!.project.name);
    // Project.location is a plain string, mirrored into both languages.
    expect(data!.kicker).toEqual({
      en: row!.project.location,
      fa: row!.project.location,
    });
    expect(data!.image).toBe(row!.project.image);
  });

  it("resolves the dark-background banner's two paragraphs from the project", async () => {
    const [data, row] = await Promise.all([
      getProjectDarkBackgroundFeature(),
      prisma.projectDarkBackgroundFeature.findUnique({
        where: { id: PROJECT_DARK_BACKGROUND_SLOT },
        include: { project: true },
      }),
    ]);

    expect(row, "seeded project-dark-background slot").not.toBeNull();
    expectKeys(
      data,
      ["ctaHref", "enabled", "image", "paragraphs", "title"],
      "ResolvedProjectDarkBackgroundFeature",
    );
    expect(data!.ctaHref).toBe(`/projects/${row!.project.slug}`);
    expect(data!.title).toEqual(row!.project.name);
    expect(data!.image).toBe(row!.project.image);
    expect(data!.paragraphs).toEqual([
      row!.project.description,
      row!.project.paragraph,
    ]);
  });

  it("resolves the standalone home-collection slot with its fixed CTA", async () => {
    const [data, row] = await Promise.all([
      getHomeCollectionFeature(),
      prisma.homeCollectionFeature.findUnique({
        where: { id: HOME_COLLECTION_SLOT },
      }),
    ]);

    expect(row, "seeded home-collection slot").not.toBeNull();
    expectKeys(
      data,
      ["ctaHref", "enabled", "image", "text", "title"],
      "ResolvedHomeCollectionFeature",
    );
    expect(data!.ctaHref).toBe(HOME_COLLECTION_HREF);
    expect(data!.image).toBe(row!.image);
    expectLocalized(data!.title, "HomeCollection.title");
    expectLocalized(data!.text, "HomeCollection.text");
  });

  it("takes the catalogue section's title and PDF link from the linked item", async () => {
    const [data, row] = await Promise.all([
      getCatalogueFeature(),
      prisma.catalogueFeature.findUnique({
        where: { id: CATALOGUE_SLOT },
        include: { catalogueItem: true },
      }),
    ]);

    expect(row, "seeded catalogue slot").not.toBeNull();
    expectKeys(
      data,
      [
        "ctaLabel",
        "downloadHref",
        "downloadName",
        "enabled",
        "image",
        "paragraphs",
        "title",
      ],
      "ResolvedCatalogueFeature",
    );
    expect(data!.title).toBe(row!.catalogueItem.title);
    // The destination PRIORITY: an uploaded pdf, then the slot's own `ctaHref`,
    // then the linked item's PDF. The seeded row has neither override, so this
    // must be the item's href — i.e. the pre-Pass-C.3 behaviour, unchanged.
    //
    // An uploaded file is the one case that is NOT its stored URL: it resolves
    // to the same-origin download route, so the browser saves the file instead
    // of rendering it (a cross-origin `download` attribute is ignored).
    expect(data!.downloadHref).toBe(
      row!.ctaPdfUrl
        ? CATALOGUE_CTA_DOWNLOAD_PATH
        : (row!.ctaHref ?? row!.catalogueItem.href),
    );
    // ...and the forced-download flag is set ONLY for an uploaded file.
    expect(data!.downloadName).toBe(
      row!.ctaPdfUrl ? (row!.ctaPdfName ?? null) : null,
    );
    expect(data!.image).toBe(row!.image);
    // The admin-editable paragraph. EMPTY is a valid answer — it means "use the
    // built-in default text" — which is why the column is nullable and no
    // backfill was needed.
    expect(data!.paragraphs).toEqual(row!.paragraphs ?? []);
    // The label override, or null to mean "compose the default in the
    // component" (the default needs the dictionary, which is a client concern).
    expect(data!.ctaLabel).toEqual(row!.ctaLabel ?? null);
  });
});

/**
 * A `flagship_one_feature` row (with `flagship` included) as Prisma returns it,
 * so override resolution can be exercised without mutating the seeded slot.
 */
function flagshipOneRow(
  overrides: Partial<{
    enabled: boolean;
    mode: FeatureMode;
    kicker: unknown;
    title: unknown;
    paragraphs: unknown;
    image: string | null;
  }> = {},
) {
  const now = new Date();
  return {
    id: FLAGSHIP_ONE_SLOT,
    enabled: true,
    mode: FeatureMode.reference,
    flagshipId: "henge-paris",
    kicker: null,
    title: null,
    paragraphs: null,
    image: null,
    createdAt: now,
    updatedAt: now,
    flagship: {
      id: "henge-paris",
      slug: "henge-paris",
      name: { en: "Henge Paris", fa: "هنژ پاریس" },
      city: { en: "Paris", fa: "پاریس" },
      image: "/flagship-paris.jpg",
      detail: null,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    ...overrides,
  };
}

describeDb("homepage-features repository — override mode & admin DTOs", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("override mode wins, while NULL override columns fall back to the entity", async () => {
    vi.spyOn(prisma.flagshipOneFeature, "findUnique").mockResolvedValue(
      flagshipOneRow({
        enabled: false,
        mode: FeatureMode.override,
        title: { en: "Paris Pop-up", fa: "پاپ‌آپ پاریس" },
        paragraphs: [{ en: "Override body", fa: "متن جایگزین" }],
      }) as never,
    );

    const data = await getFlagshipOneFeature();

    expect(data!.enabled).toBe(false);
    expect(data!.title).toEqual({ en: "Paris Pop-up", fa: "پاپ‌آپ پاریس" });
    expect(data!.paragraphs).toEqual([
      { en: "Override body", fa: "متن جایگزین" },
    ]);
    // kicker + image are NULL in override mode → the linked flagship's values.
    expect(data!.kicker).toEqual({ en: "Paris", fa: "پاریس" });
    expect(data!.image).toBe("/flagship-paris.jpg");
    // The CTA still targets the linked entity — overrides never move it.
    expect(data!.ctaHref).toBe("/flagship/henge-paris");
  });

  it("override mode treats an empty paragraphs array as intentional", async () => {
    vi.spyOn(prisma.flagshipOneFeature, "findUnique").mockResolvedValue(
      flagshipOneRow({ mode: FeatureMode.override, paragraphs: [] }) as never,
    );

    const data = await getFlagshipOneFeature();

    expect(data!.paragraphs).toEqual([]);
    expect(data!.title).toEqual({ en: "Henge Paris", fa: "هنژ پاریس" });
  });

  it("resolves to null when a slot row is missing", async () => {
    vi.spyOn(prisma.flagshipOneFeature, "findUnique").mockResolvedValue(null);

    expect(await getFlagshipOneFeature()).toBeNull();
  });

  it("overview lists every slot in homepage render order, fully serializable", async () => {
    const rows = await getHomepageFeaturesOverview();

    // Seven since Pass D.1 added the hero and the video section, and the order
    // is the order the public page renders them.
    expect(rows.map((row) => row.id)).toEqual([
      HERO_SLOT,
      FLAGSHIP_ONE_SLOT,
      VIDEO_SLOT,
      CATALOGUE_SLOT,
      HOME_COLLECTION_SLOT,
      PROJECT_BANNER_SLOT,
      PROJECT_DARK_BACKGROUND_SLOT,
    ]);

    for (const row of rows) {
      expectKeys(
        row,
        [
          "configured",
          "enabled",
          "entityHref",
          "entityLabel",
          "id",
          "mode",
          "updatedAt",
        ],
        `overview ${row.id}`,
      );
      if (row.configured) {
        // ISO strings, not Date objects: the DTO crosses to client components.
        expect(typeof row.updatedAt, `${row.id} updatedAt`).toBe("string");
      } else {
        // A missing singleton row is a supported state — the component then
        // renders its built-in content — and it must report `null`, not throw.
        expect(row.updatedAt, `${row.id} updatedAt`).toBeNull();
      }
    }

    // The five banners this project has always seeded are always configured.
    for (const id of [
      FLAGSHIP_ONE_SLOT,
      CATALOGUE_SLOT,
      HOME_COLLECTION_SLOT,
      PROJECT_BANNER_SLOT,
      PROJECT_DARK_BACKGROUND_SLOT,
    ]) {
      expect(rows.find((row) => row.id === id)!.configured, `${id} seeded`).toBe(
        true,
      );
    }

    // Pass D.1 slots have no linked entity, so they never report a mode.
    expect(rows.find((row) => row.id === HERO_SLOT)!.mode).toBeNull();
    expect(rows.find((row) => row.id === VIDEO_SLOT)!.mode).toBeNull();

    const collection = rows.find((row) => row.id === HOME_COLLECTION_SLOT)!;
    expect(collection.mode, "standalone slot has no mode").toBeNull();
    expect(collection.entityHref).toBe(HOME_COLLECTION_HREF);

    // The catalogue slot references a CatalogueItem too, but its content model
    // has no mode toggle — like the Home Collection slot it reports `null`.
    const catalogue = rows.find((row) => row.id === CATALOGUE_SLOT)!;
    expect(catalogue.mode, "catalogue slot has no mode").toBeNull();

    for (const row of rows.filter(
      (r) =>
        r.id !== HOME_COLLECTION_SLOT &&
        r.id !== CATALOGUE_SLOT &&
        r.id !== HERO_SLOT &&
        r.id !== VIDEO_SLOT,
    )) {
      expect(row.mode, `${row.id} mode`).toBe(FeatureMode.reference);
      expect(row.entityHref, `${row.id} href`).toBeTypeOf("string");
    }
  });

  it("hands the admin form the flagship slot's stored (unresolved) columns", async () => {
    const [detail, row] = await Promise.all([
      getFlagshipOneFeatureAdminDetail(),
      prisma.flagshipOneFeature.findUnique({
        where: { id: FLAGSHIP_ONE_SLOT },
      }),
    ]);

    expect(row).not.toBeNull();
    expect(detail).toEqual({
      enabled: row!.enabled,
      mode: row!.mode,
      flagshipId: row!.flagshipId,
      kicker: row!.kicker ?? null,
      title: row!.title ?? null,
      paragraphs: row!.paragraphs ?? null,
      image: row!.image,
    });
  });
});

describeDb("homepage-features repository — writes", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("saves override content on the flagship slot", async () => {
    const input: FlagshipOneFeatureWriteInput = {
      enabled: false,
      mode: FeatureMode.override,
      flagshipId: "henge-paris",
      kicker: { en: "Kicker", fa: "کیکر" },
      title: { en: "Title", fa: "عنوان" },
      paragraphs: [{ en: "Body", fa: "متن" }],
      image: "/override.jpg",
    };

    await expect(
      prisma.$transaction(async (tx) => {
        await updateFlagshipOneFeature(input, tx);

        const row = await tx.flagshipOneFeature.findUnique({
          where: { id: FLAGSHIP_ONE_SLOT },
        });
        expect(row).not.toBeNull();
        expect(row!.enabled).toBe(false);
        expect(row!.mode).toBe(FeatureMode.override);
        expect(row!.kicker).toEqual(input.kicker);
        expect(row!.title).toEqual(input.title);
        expect(row!.paragraphs).toEqual(input.paragraphs);
        expect(row!.image).toBe(input.image);

        throw new Error("intentional test rollback");
      }, TX_OPTIONS),
    ).rejects.toThrow("intentional test rollback");
  });

  it("stores SQL NULL for override columns left empty in reference mode", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await updateFlagshipOneFeature(
          {
            enabled: true,
            mode: FeatureMode.reference,
            flagshipId: "henge-paris",
            kicker: null,
            title: null,
            paragraphs: null,
            image: null,
          },
          tx,
        );

        const row = await tx.flagshipOneFeature.findUnique({
          where: { id: FLAGSHIP_ONE_SLOT },
        });
        expect(row!.enabled).toBe(true);
        expect(row!.kicker).toBeNull();
        expect(row!.title).toBeNull();
        expect(row!.paragraphs).toBeNull();
        expect(row!.image).toBeNull();

        throw new Error("intentional test rollback");
      }, TX_OPTIONS),
    ).rejects.toThrow("intentional test rollback");
  });

  it("saves the standalone home-collection slot's required jsonb columns", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await updateHomeCollectionFeature(
          {
            enabled: true,
            image: "/collection.jpg",
            title: { en: "Home", fa: "خانه" },
            text: { en: "Text", fa: "متن" },
          },
          tx,
        );

        const row = await tx.homeCollectionFeature.findUnique({
          where: { id: HOME_COLLECTION_SLOT },
        });
        expect(row!.image).toBe("/collection.jpg");
        expect(row!.title).toEqual({ en: "Home", fa: "خانه" });
        expect(row!.text).toEqual({ en: "Text", fa: "متن" });

        throw new Error("intentional test rollback");
      }, TX_OPTIONS),
    ).rejects.toThrow("intentional test rollback");
  });

  it("repoints the catalogue slot at another catalogue item", async () => {
    const [target] = await prisma.catalogueItem.findMany({
      select: { id: true },
      orderBy: { sortOrder: "asc" },
      take: 1,
    });
    expect(target, "seeded catalogue items").toBeDefined();

    await expect(
      prisma.$transaction(async (tx) => {
        await updateCatalogueFeature(
          {
            enabled: false,
            catalogueItemId: target.id,
            image: "/cat.jpg",
            paragraphs: [{ en: "Edited copy", fa: "متن ویرایش‌شده" }],
            ctaLabel: { en: "Download S34", fa: "دانلود S34" },
            ctaHref: "https://example.com/s34.pdf",
            ctaPdfUrl: "https://cdn.example.test/media/catalogue/s34.pdf",
            ctaPdfName: "Henge Catalogue S34-5.pdf",
          },
          tx,
        );

        const row = await tx.catalogueFeature.findUnique({
          where: { id: CATALOGUE_SLOT },
        });
        expect(row!.enabled).toBe(false);
        expect(row!.catalogueItemId).toBe(target.id);
        expect(row!.image).toBe("/cat.jpg");
        // The admin-editable paragraph round-trips (the column added for it).
        expect(row!.paragraphs).toEqual([
          { en: "Edited copy", fa: "متن ویرایش‌شده" },
        ]);
        // ...and so does the editable CTA (Pass C.3).
        expect(row!.ctaLabel).toEqual({ en: "Download S34", fa: "دانلود S34" });
        expect(row!.ctaHref).toBe("https://example.com/s34.pdf");
        // ...and the uploaded pdf, with its presentable name (Pass C.4).
        expect(row!.ctaPdfUrl).toBe(
          "https://cdn.example.test/media/catalogue/s34.pdf",
        );
        expect(row!.ctaPdfName).toBe("Henge Catalogue S34-5.pdf");

        throw new Error("intentional test rollback");
      }, TX_OPTIONS),
    ).rejects.toThrow("intentional test rollback");
  });
});

