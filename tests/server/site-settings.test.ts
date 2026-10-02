/**
 * Pass 13.5D — the site-settings repository against the real dev database.
 *
 * Same two strategies as every DB tier here, and for the same reason (never
 * disturb the shared database):
 *
 *   - WRITE tests run inside a transaction that is rolled back, using the
 *     repository's `db` seam. Nothing is committed, so nothing can leak.
 *   - READ tests need committed rows (the readers are React-`cache()`d and take
 *     no transaction client), so their fixtures ARE committed and removed again
 *     in `afterAll`. Every assertion is scoped to this run's own rows.
 *
 * `site_settings` is a singleton the seed already creates, so the write tests
 * exercise the UPSERT path on the existing row rather than inventing a second
 * one — which is exactly the property that matters: a second row must be
 * impossible.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  SITE_SETTINGS_ID,
  createSocialLink,
  deleteSocialLink,
  getActiveSocialLinks,
  getSiteSettings,
  getSocialLinks,
  reorderSocialLinks,
  updateSocialLink,
  upsertSiteSettings,
} from "@/lib/repositories/site-settings";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { TX_OPTIONS } from "@/tests/helpers/tx";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const ROLLBACK = "intentional test rollback";

/** Namespace every fixture so this run can find (and clean) exactly its own. */
const RUN = randomUUID().slice(0, 8);
const platformFor = (suffix: string) => `test-${RUN}-${suffix}`;

async function inRollback(
  fn: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  await expect(
    prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Error(ROLLBACK);
    }, TX_OPTIONS),
  ).rejects.toThrow(ROLLBACK);
}

/** Committed fixtures for the read tests. */
const committed: string[] = [];

async function commitLink(
  suffix: string,
  overrides: Partial<Parameters<typeof createSocialLink>[0]> = {},
) {
  const row = await createSocialLink({
    platform: platformFor(suffix),
    label: `Link ${suffix}`,
    url: "https://example.com/",
    sortOrder: 0,
    isActive: true,
    ...overrides,
  });
  committed.push(row.id);
  return row;
}

describeDb("site settings repository", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    if (committed.length > 0) {
      await prisma.socialLink.deleteMany({ where: { id: { in: committed } } });
    }
    // Belt and braces: anything this run created that is not tracked.
    await prisma.socialLink.deleteMany({
      where: { platform: { startsWith: `test-${RUN}-` } },
    });
    await prisma.$disconnect();
  });

  describe("getSiteSettings", () => {
    it("returns the singleton row with brand assets resolved through Media", async () => {
      const settings = await getSiteSettings();

      expect(settings).not.toBeNull();
      expect(settings?.id).toBe(SITE_SETTINGS_ID);
      // The seed sets no logo/favicon, so both resolve to null — which is what
      // makes the navbar fall back to the text wordmark.
      expect(settings?.logoUrl).toBeNull();
      expect(settings?.faviconUrl).toBeNull();
      expect(settings?.siteName.en.length).toBeGreaterThan(0);
      expect(settings?.siteName.fa.length).toBeGreaterThan(0);
    });
  });

  describe("upsertSiteSettings", () => {
    it("updates the EXISTING row rather than inserting a second one", async () => {
      await inRollback(async (tx) => {
        const before = await tx.siteSettings.count();

        await upsertSiteSettings(
          {
            siteName: { en: "Test", fa: "تست" },
            siteDescription: { en: "d", fa: "د" },
            logoMediaId: null,
            faviconMediaId: null,
            phone: "+989120000000",
            email: "seed@example.com",
            address: { en: "Tehran", fa: "تهران" },
          },
          tx,
        );

        // The singleton invariant: still exactly one row.
        expect(await tx.siteSettings.count()).toBe(before);
        const row = await tx.siteSettings.findUnique({
          where: { id: SITE_SETTINGS_ID },
        });
        expect(row?.phone).toBe("+989120000000");
        expect(row?.address).toMatchObject({ en: "Tehran", fa: "تهران" });
      });
    });

    it("clears a previously set field when null is passed", async () => {
      await inRollback(async (tx) => {
        await upsertSiteSettings(
          {
            siteName: { en: "Test", fa: "تست" },
            siteDescription: { en: "d", fa: "د" },
            logoMediaId: null,
            faviconMediaId: null,
            phone: "+989120000000",
            email: null,
            address: null,
          },
          tx,
        );

        await upsertSiteSettings(
          {
            siteName: { en: "Test", fa: "تست" },
            siteDescription: { en: "d", fa: "د" },
            logoMediaId: null,
            faviconMediaId: null,
            phone: null,
            email: null,
            address: null,
          },
          tx,
        );

        const row = await tx.siteSettings.findUnique({
          where: { id: SITE_SETTINGS_ID },
        });
        expect(row?.phone).toBeNull();
        expect(row?.address).toBeNull();
      });
    });
  });

  describe("social links", () => {
    it("create -> update -> delete round-trips", async () => {
      await inRollback(async (tx) => {
        const created = await createSocialLink(
          {
            platform: platformFor("crud"),
            label: "Original",
            url: "https://example.com/a",
            sortOrder: 5,
            isActive: true,
          },
          tx,
        );

        const updated = await updateSocialLink(
          created.id,
          { label: "Renamed", isActive: false },
          tx,
        );
        expect(updated.label).toBe("Renamed");
        expect(updated.isActive).toBe(false);
        // A partial patch must not clobber the untouched fields.
        expect(updated.url).toBe("https://example.com/a");

        await deleteSocialLink(created.id, tx);
        expect(
          await tx.socialLink.findUnique({ where: { id: created.id } }),
        ).toBeNull();
      });
    });

    it("throws P2025 for an unknown id, so the action can report notFound", async () => {
      await inRollback(async (tx) => {
        const error = await updateSocialLink(
          randomUUID(),
          { label: "x" },
          tx,
        ).catch((e: unknown) => e);

        expect(
          error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025",
        ).toBe(true);
      });
    });

    it("rewrites display order from an ordered list of ids", async () => {
      await inRollback(async (tx) => {
        const a = await createSocialLink(
          { platform: platformFor("ord-a"), label: "A", url: "https://a.test/", sortOrder: 0, isActive: true },
          tx,
        );
        const b = await createSocialLink(
          { platform: platformFor("ord-b"), label: "B", url: "https://b.test/", sortOrder: 1, isActive: true },
          tx,
        );

        await reorderSocialLinks([b.id, a.id], tx);

        expect((await tx.socialLink.findUnique({ where: { id: b.id } }))?.sortOrder).toBe(0);
        expect((await tx.socialLink.findUnique({ where: { id: a.id } }))?.sortOrder).toBe(1);
      });
    });
  });

  describe("active filtering (committed fixtures)", () => {
    it("hides an INACTIVE link from the public reader but keeps it for the admin", async () => {
      const active = await commitLink("visible");
      const hidden = await commitLink("hidden", { isActive: false });

      const publicLinks = await getActiveSocialLinks();
      const adminLinks = await getSocialLinks();

      expect(publicLinks.map((link) => link.id)).toContain(active.id);
      expect(publicLinks.map((link) => link.id)).not.toContain(hidden.id);

      // The admin still sees it — disabling hides a link, it does not delete it.
      expect(adminLinks.map((link) => link.id)).toContain(hidden.id);
    });

    it("returns links in ascending sortOrder", async () => {
      await commitLink("order-late", { sortOrder: 900 });
      await commitLink("order-early", { sortOrder: -1 });

      const links = await getSocialLinks();

      for (let i = 1; i < links.length; i += 1) {
        expect(
          links[i - 1].sortOrder,
          "getSocialLinks is ordered by sortOrder ascending",
        ).toBeLessThanOrEqual(links[i].sortOrder);
      }
    });
  });
});
