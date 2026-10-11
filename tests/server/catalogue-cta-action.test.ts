/**
 * Pass C.3 — the catalogue CTA SERVER ACTION, invoked for real.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Pass C.3 shipped with unit coverage of the SCHEMA and a rolled-back
 * repository test, but nothing drove `updateCatalogueFeatureAction` itself. The
 * three things that matter to an operator were therefore asserted rather than
 * demonstrated:
 *
 *   1. an EMPTY custom URL writes SQL NULL, so the homepage falls back to the
 *      linked `CatalogueItem.href` — the pre-existing behaviour;
 *   2. an UNSAFE URL is refused with a `ctaHref` field issue and changes NOTHING;
 *   3. a configured URL is what the homepage actually resolves.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the action module, the repository, `@/lib/auth/auth`, the database, and
 * the session cookie — minted by a real `auth.api.signInEmail` call, so it is a
 * genuine signed token, exactly what a browser holds.
 *
 * STUBBED: only Next's request context. `headers()` is pointed at that real
 * cookie; `next/cache` is a no-op because `revalidatePath`/`refresh` throw
 * outside a Next request. Nothing about the write path is mocked.
 *
 * ── Data safety ────────────────────────────────────────────────────────────
 *
 * The catalogue slot is a SINGLETON row that carries the operator's real
 * content. This file snapshots every column before it runs and restores it
 * afterwards, then RE-READS the row to prove the restore landed. It never
 * leaves the row changed.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Next's request context — the only thing mocked                     */
/* ------------------------------------------------------------------ */

const state = vi.hoisted(() => ({ cookieHeader: "" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: state.cookieHeader }),
  cookies: async () => ({ set: () => {}, get: () => undefined, delete: () => {} }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  refresh: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
}));

import {
  cleanupFixture,
  closeDb,
  hasDatabaseUrl,
  query,
  setUserFlags,
  uniqueEmail,
  uniqueTestIp,
} from "@/tests/helpers/auth-db";
import { updateCatalogueFeatureAction } from "@/lib/admin/actions/homepage";
import { auth } from "@/lib/auth/auth";
import { CATALOGUE_SLOT, CATALOGUE_CTA_DOWNLOAD_PATH } from "@/lib/repositories/homepage-features";

const describeDb = describe.skipIf(!hasDatabaseUrl);

/* ------------------------------------------------------------------ */
/* The singleton row — snapshot, and restore                          */
/* ------------------------------------------------------------------ */

type Row = {
  id: string;
  enabled: boolean;
  catalogueItemId: string;
  image: string;
  paragraphs: unknown;
  ctaLabel: unknown;
  ctaHref: string | null;
  ctaPdfUrl: string | null;
  ctaPdfName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

let snapshot: Row | null = null;

async function readSlot(): Promise<Row> {
  const rows = await query<Row>(
    `SELECT id, enabled, "catalogueItemId", image, paragraphs, "ctaLabel", "ctaHref",
            "ctaPdfUrl", "ctaPdfName", "createdAt", "updatedAt"
       FROM catalogue_feature WHERE id = $1`,
    [CATALOGUE_SLOT],
  );
  if (!rows[0]) throw new Error("the catalogue slot row is missing");
  return rows[0];
}

/** The linked item's href — the documented fallback for an empty override. */
async function linkedItemHref(itemId: string): Promise<string> {
  const rows = await query<{ href: string }>(
    `SELECT href FROM catalogue_item WHERE id = $1`,
    [itemId],
  );
  if (!rows[0]) throw new Error(`catalogue_item ${itemId} is missing`);
  return rows[0].href;
}

/** What the public homepage would resolve the button to. */
async function resolvedHref(): Promise<string> {
  const { getCatalogueFeature } = await import(
    "@/lib/repositories/homepage-features"
  );
  const resolved = await getCatalogueFeature();
  if (!resolved) throw new Error("getCatalogueFeature() returned null");
  return resolved.downloadHref;
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const created: { id: string; email: string }[] = [];

async function accountWithSession(
  role: "user" | "admin" | "owner",
): Promise<{ id: string; email: string; cookie: string }> {
  const email = uniqueEmail();
  const password = "correct-horse-battery-staple";

  const signedUp = await auth.api.signUpEmail({
    body: { email, password, name: email },
    headers: new Headers({ "x-forwarded-for": uniqueTestIp() }),
  });
  const id = (signedUp as { user?: { id?: string } }).user?.id;
  if (!id) throw new Error("sign-up returned no user id");
  created.push({ id, email });
  await setUserFlags(id, { role });

  const signedIn = await auth.api.signInEmail({
    body: { email, password },
    headers: new Headers({ "x-forwarded-for": uniqueTestIp() }),
    returnHeaders: true,
  });
  const cookie = signedIn.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("sign-in returned no cookie");

  return { id, email, cookie };
}

/** A valid submission, seeded from the row as the admin form would load it. */
function submission(overrides: Record<string, unknown>) {
  const row = snapshot!;
  return {
    enabled: row.enabled,
    catalogueItemId: row.catalogueItemId,
    image: row.image,
    // The raw jsonb comes back untyped from SQL; the shape is the schema's job.
    paragraphs: (row.paragraphs ?? []) as { en: string; fa: string }[],
    ctaLabel: (row.ctaLabel ?? { en: "", fa: "" }) as { en: string; fa: string },
    ctaHref: row.ctaHref ?? "",
    ctaPdfUrl: row.ctaPdfUrl ?? "",
    ctaPdfName: row.ctaPdfName ?? "",
    ...overrides,
  };
}

describeDb("updateCatalogueFeatureAction — the real action", () => {
  beforeAll(async () => {
    // Snapshot the operator's row BEFORE anything can touch it. It is restored
    // in `afterAll`, and the restore is verified by re-reading the row.
    snapshot = await readSlot();
    expect(snapshot.id).toBe(CATALOGUE_SLOT);
    // A saved label with NO url override — so the fallback asserted below is the
    // live behaviour of this database, not a contrived state.
    expect(snapshot.catalogueItemId).toBeTruthy();
  });

  beforeEach(() => {
    state.cookieHeader = "";
  });

  afterAll(async () => {
    // Restore the operator's row EXACTLY, then prove it landed.
    if (snapshot) {
      await query(
        `UPDATE catalogue_feature
            SET enabled = $2, "catalogueItemId" = $3, image = $4,
                paragraphs = $5::jsonb, "ctaLabel" = $6::jsonb, "ctaHref" = $7,
                "ctaPdfUrl" = $8, "ctaPdfName" = $9,
                "createdAt" = $10, "updatedAt" = $11
          WHERE id = $1`,
        [
          CATALOGUE_SLOT,
          snapshot.enabled,
          snapshot.catalogueItemId,
          snapshot.image,
          snapshot.paragraphs === null ? null : JSON.stringify(snapshot.paragraphs),
          snapshot.ctaLabel === null ? null : JSON.stringify(snapshot.ctaLabel),
          snapshot.ctaHref,
          snapshot.ctaPdfUrl,
          snapshot.ctaPdfName,
          snapshot.createdAt,
          snapshot.updatedAt,
        ],
      );
      const restored = await readSlot();
      expect(restored.ctaHref).toBe(snapshot.ctaHref);
      expect(restored.updatedAt.getTime()).toBe(snapshot.updatedAt.getTime());
    }

    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ---------------------------------------------------------------- */
  /* Authorization                                                     */
  /* ---------------------------------------------------------------- */

  it("refuses an UNAUTHENTICATED call", async () => {
    await expect(
      updateCatalogueFeatureAction(submission({ ctaHref: "https://evil.test/x" })),
    ).rejects.toThrow();
    // Nothing was written.
    expect((await readSlot()).ctaHref).toBe(snapshot!.ctaHref);
  });

  it("refuses a CUSTOMER, even with a valid session", async () => {
    const customer = await accountWithSession("user");
    state.cookieHeader = customer.cookie;

    await expect(
      updateCatalogueFeatureAction(submission({ ctaHref: "https://evil.test/x" })),
    ).rejects.toThrow();
    expect((await readSlot()).ctaHref).toBe(snapshot!.ctaHref);
  });

  /* ---------------------------------------------------------------- */
  /* The destination: empty → fallback, configured → override          */
  /* ---------------------------------------------------------------- */

  it("an EMPTY url writes SQL NULL and the homepage falls back to CatalogueItem.href", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaHref: "" }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    // The column really is NULL, not an empty string — that is what makes the
    // fallback happen at all.
    expect((await readSlot()).ctaHref).toBeNull();

    // ...and the homepage resolves the LINKED ITEM's href.
    expect(await resolvedHref()).toBe(
      await linkedItemHref(snapshot!.catalogueItemId),
    );
  });

  it("a configured url persists and is what the homepage resolves", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const url = "https://example.com/cta-s34.pdf";
    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaHref: url }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    expect((await readSlot()).ctaHref).toBe(url);
    expect(await resolvedHref()).toBe(url);
  });

  it("a PASTED url with surrounding whitespace is stored trimmed", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaHref: "  https://example.com/padded.pdf  " }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    // The trim is the fix for "I pasted a perfectly good URL and the form said
    // it was invalid".
    expect((await readSlot()).ctaHref).toBe("https://example.com/padded.pdf");
    expect(await resolvedHref()).toBe("https://example.com/padded.pdf");
  });

  /* ---------------------------------------------------------------- */
  /* Rejection                                                         */
  /* ---------------------------------------------------------------- */

  it("an UNSAFE url is refused with a ctaHref field issue, and changes NOTHING", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    // Establish a known good value first, so "unchanged" is a real assertion.
    await updateCatalogueFeatureAction(
      submission({ ctaHref: "https://example.com/keep.pdf" }),
    );
    const before = await readSlot();

    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:msgbox(1)",
      "ftp://example.com/x",
      "not a url",
    ]) {
      const outcome = await updateCatalogueFeatureAction(
        submission({ ctaHref: bad }),
      );
      expect(outcome.ok, bad).toBe(false);
      if (!outcome.ok) {
        expect(
          outcome.issues.map((i) => `${i.field}:${i.code}`),
          bad,
        ).toContain("ctaHref:invalidLink");
      }
    }

    const after = await readSlot();
    expect(after.ctaHref).toBe(before.ctaHref);
    expect(after.ctaHref).toBe("https://example.com/keep.pdf");
  });

  it("does NOT let a rejection silently substitute a different destination", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateCatalogueFeatureAction(
      submission({ ctaHref: "https://example.com/keep.pdf" }),
    );

    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaHref: "javascript:alert(1)" }),
    );
    expect(outcome.ok).toBe(false);

    // The rejected value must not have been swapped for the linked item's href,
    // nor written at all — the previous explicit value stands.
    expect(await resolvedHref()).toBe("https://example.com/keep.pdf");
  });

  it("an OWNER may save the CTA too", async () => {
    const owner = await accountWithSession("owner");
    state.cookieHeader = owner.cookie;

    const url = "https://example.com/owner-set.pdf";
    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaHref: url }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    expect(await resolvedHref()).toBe(url);
  });

  /* ---------------------------------------------------------------- */
  /* The uploaded PDF (Pass C.4)                                       */
  /* ---------------------------------------------------------------- */

  it("an UPLOADED pdf OUTRANKS a configured link, and carries its name", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const { getCatalogueFeature } = await import(
      "@/lib/repositories/homepage-features"
    );

    const pdfUrl = "https://bucket.example.test/media/catalogue/1-cat.pdf";
    const outcome = await updateCatalogueFeatureAction(
      submission({
        // Both are set on purpose: the file is the more specific instruction.
        ctaHref: "https://example.com/link-should-lose.pdf",
        ctaPdfUrl: pdfUrl,
        ctaPdfName: "Henge Catalogue S34-5.pdf",
      }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    const row = await readSlot();
    expect(row.ctaPdfUrl).toBe(pdfUrl);
    expect(row.ctaPdfName).toBe("Henge Catalogue S34-5.pdf");

    const resolved = await getCatalogueFeature();
    // The column stores the STORAGE url; the CTA must address the SAME-ORIGIN
    // download route instead, because the CDN serves the file inline and a
    // cross-origin `download` attribute is ignored.
    expect(resolved!.downloadHref).toBe(CATALOGUE_CTA_DOWNLOAD_PATH);
    // The non-null name is the component's signal to render a forced-download
    // anchor instead of a locale-aware link.
    expect(resolved!.downloadName).toBe("Henge Catalogue S34-5.pdf");
  });

  it("CLEARING the pdf restores the link, then the linked item", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const { getCatalogueFeature } = await import(
      "@/lib/repositories/homepage-features"
    );

    // With a pdf AND a link: the pdf wins.
    await updateCatalogueFeatureAction(
      submission({
        ctaHref: "https://example.com/link.pdf",
        ctaPdfUrl: "https://bucket.example.test/media/catalogue/2-cat.pdf",
        ctaPdfName: "two.pdf",
      }),
    );
    expect((await getCatalogueFeature())!.downloadName).toBe("two.pdf");

    // Remove the pdf, keep the link: the link is used, and the forced-download
    // flag is dropped (a link is not a download).
    await updateCatalogueFeatureAction(
      submission({
        ctaHref: "https://example.com/link.pdf",
        ctaPdfUrl: "",
        ctaPdfName: "",
      }),
    );
    const afterLink = await readSlot();
    expect(afterLink.ctaPdfUrl).toBeNull();
    expect(afterLink.ctaPdfName).toBeNull();
    expect(await resolvedHref()).toBe("https://example.com/link.pdf");
    expect((await getCatalogueFeature())!.downloadName).toBeNull();

    // Remove the link too: the linked item's own PDF is the last resort.
    await updateCatalogueFeatureAction(
      submission({ ctaHref: "", ctaPdfUrl: "", ctaPdfName: "" }),
    );
    expect(await resolvedHref()).toBe(
      await linkedItemHref(snapshot!.catalogueItemId),
    );
    expect((await getCatalogueFeature())!.downloadName).toBeNull();
  });

  it("nulls the NAME whenever the URL is cleared, so the pair cannot disagree", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    // A forged submission that sends a name with no url — the action must not
    // persist a filename for a file that is not there.
    const outcome = await updateCatalogueFeatureAction(
      submission({ ctaPdfUrl: "", ctaPdfName: "orphan.pdf" }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    const row = await readSlot();
    expect(row.ctaPdfUrl).toBeNull();
    expect(row.ctaPdfName).toBeNull();
  });

  it("keeps the download signal even when the NAME column is empty", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const { getCatalogueFeature } = await import(
      "@/lib/repositories/homepage-features"
    );

    // A forged (or hand-repaired) submission: a file with no name. The schema
    // does not force the pair, so the row can hold this shape — and the CTA
    // must still be a download. Keying the signal off `ctaPdfName` would leave
    // the component rendering a locale-aware `Link`, which rewrites
    // `/api/catalogue/cta` to `/fa/api/catalogue/cta` and 404s.
    const outcome = await updateCatalogueFeatureAction(
      submission({
        ctaPdfUrl: "https://bucket.example.test/media/catalogue/nameless.pdf",
        ctaPdfName: "",
      }),
    );
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    expect((await readSlot()).ctaPdfName).toBeNull();

    const resolved = await getCatalogueFeature();
    expect(resolved!.downloadHref).toBe(CATALOGUE_CTA_DOWNLOAD_PATH);
    expect(resolved!.downloadName).toBe("catalogue.pdf");
  });

  it("refuses an UNSAFE pdf url with a field issue, and changes NOTHING", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateCatalogueFeatureAction(
      submission({
        ctaPdfUrl: "https://bucket.example.test/media/catalogue/keep.pdf",
        ctaPdfName: "keep.pdf",
      }),
    );

    for (const ctaPdfUrl of ["javascript:alert(1)", "not a url"]) {
      const outcome = await updateCatalogueFeatureAction(
        submission({ ctaPdfUrl }),
      );
      expect(outcome.ok, ctaPdfUrl).toBe(false);
      if (!outcome.ok) {
        expect(outcome.issues.map((i) => i.field), ctaPdfUrl).toContain(
          "ctaPdfUrl",
        );
      }
    }

    const row = await readSlot();
    expect(row.ctaPdfUrl).toBe(
      "https://bucket.example.test/media/catalogue/keep.pdf",
    );
  });
});
