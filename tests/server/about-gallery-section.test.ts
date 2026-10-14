/**
 * The `/about` gallery section, driven through the REAL action.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * The unit tests prove the schema shape and that the admin form is wired. The
 * three things an operator actually depends on are only demonstrable end to end:
 *
 *   1. an ADMIN can save, and a CUSTOMER or an anonymous caller cannot;
 *   2. what was saved is exactly what the PUBLIC page reads back — same order,
 *      same count, no blank rows;
 *   3. an empty list is a real, storable state (it is how the gallery is taken
 *      off the page), and an absent row falls back to the seeded photos.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the action module, the repository, `@/lib/auth/auth`, the database, and
 * the session cookie — minted by a real `auth.api.signInEmail` call.
 *
 * STUBBED: only Next's request context. `headers()` points at that real cookie;
 * `next/cache` is a no-op because `revalidatePath` throws outside a request.
 *
 * ── Data safety ────────────────────────────────────────────────────────────
 *
 * `gallerySection` is a singleton row that would carry the operator's real
 * photos. This file snapshots whatever row exists before it runs, deletes it
 * between tests, and restores the snapshot afterwards.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/* ------------------------------------------------------------------ */
/* Next's request context — the only thing mocked                     */
/* ------------------------------------------------------------------ */

const state = vi.hoisted(() => ({ cookieHeader: "" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: state.cookieHeader }),
  cookies: async () => ({
    set: () => {},
    get: () => undefined,
    delete: () => {},
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  refresh: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
}));

/**
 * `@/tests/helpers/auth-db` MUST be imported before anything that reaches
 * `lib/db/prisma.ts` — the ORDER of these import statements is load-bearing.
 *
 * That helper module begins with `import "dotenv/config"`, which is what puts
 * `DATABASE_URL` into `process.env`. `lib/db/prisma.ts` reads
 * `process.env.DATABASE_URL` ONCE, at module-evaluation time, to build its pg
 * adapter. Import the helper second and the adapter is constructed from
 * `undefined`, so every Prisma query dials `localhost:5432` and dies with
 * ECONNREFUSED — while the raw `pg` pool in this same file keeps working,
 * because it is created lazily and reads the env when it is first used. That
 * asymmetry is what makes the mistake so confusing to diagnose: the file looks
 * like it has a working database connection.
 */
import {
  cleanupFixture,
  closeDb,
  hasDatabaseUrl,
  query,
  setUserFlags,
  uniqueEmail,
  uniqueTestIp,
} from "@/tests/helpers/auth-db";

import { updateAboutPageSectionAction } from "@/lib/admin/actions/about";
import { getAboutGalleryImages } from "@/lib/data/about";
import { getAboutPageContent } from "@/lib/repositories/about-page";
import { auth } from "@/lib/auth/auth";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const SECTION_KEY = "gallerySection";

type SectionRow = {
  sectionKey: string;
  sortOrder: number;
  content: { images?: string[] } | null;
};

let snapshot: SectionRow | null = null;

const readSection = async (): Promise<SectionRow | null> =>
  (
    await query<SectionRow>(
      `SELECT "sectionKey", "sortOrder", content FROM about_page_section WHERE "sectionKey" = $1`,
      [SECTION_KEY],
    )
  )[0] ?? null;

/** The photos as they are actually STORED (not through the cached read). */
const storedImages = async (): Promise<string[]> =>
  (await readSection())?.content?.images ?? [];

/** What the public page would render. */
const publicImages = async (): Promise<string[]> =>
  (await getAboutPageContent()).gallery.images;

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

const photo = (n: number) => `https://media.karentagseal.ir/media/about/photo-${n}.jpg`;

describeDb("the /about gallery section", () => {
  beforeAll(async () => {
    snapshot = await readSection();
  });

  beforeEach(async () => {
    state.cookieHeader = "";
    // "Never saved" is also the state the public page must fall back from.
    await query(`DELETE FROM about_page_section WHERE "sectionKey" = $1`, [
      SECTION_KEY,
    ]);
  });

  afterEach(async () => {
    await query(`DELETE FROM about_page_section WHERE "sectionKey" = $1`, [
      SECTION_KEY,
    ]);
  });

  afterAll(async () => {
    if (snapshot) {
      await query(
        `INSERT INTO about_page_section ("sectionKey", "sortOrder", content, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::jsonb, now(), now())
         ON CONFLICT ("sectionKey") DO UPDATE SET "sortOrder" = $2, content = $3::jsonb`,
        [
          snapshot.sectionKey,
          snapshot.sortOrder,
          JSON.stringify(snapshot.content),
        ],
      );
    }

    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ---------------------------------------------------------------- */
  /* The fallback                                                      */
  /* ---------------------------------------------------------------- */

  it("falls back to the seeded photos while no row exists", async () => {
    expect(await storedImages()).toEqual([]);
    expect(await publicImages()).toEqual(getAboutGalleryImages());
  });

  /* ---------------------------------------------------------------- */
  /* Authorization                                                     */
  /* ---------------------------------------------------------------- */

  it("refuses an UNAUTHENTICATED save", async () => {
    await expect(
      updateAboutPageSectionAction(SECTION_KEY, { images: [photo(1)] }),
    ).rejects.toThrow();
    expect(await storedImages()).toEqual([]);
  });

  it("refuses a CUSTOMER's save, even with a valid session", async () => {
    const customer = await accountWithSession("user");
    state.cookieHeader = customer.cookie;

    await expect(
      updateAboutPageSectionAction(SECTION_KEY, { images: [photo(1)] }),
    ).rejects.toThrow();
    expect(await storedImages()).toEqual([]);
  });

  /* ---------------------------------------------------------------- */
  /* The round trip                                                    */
  /* ---------------------------------------------------------------- */

  it("lets an ADMIN save photos, and the public read returns them IN ORDER", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const images = [photo(3), photo(1), photo(2)];
    const outcome = await updateAboutPageSectionAction(SECTION_KEY, { images });

    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    expect(await storedImages()).toEqual(images);
    expect(await publicImages()).toEqual(images);
  });

  it("accepts ANY number of photos — one, and many", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const one = [photo(1)];
    expect(
      (await updateAboutPageSectionAction(SECTION_KEY, { images: one })).ok,
    ).toBe(true);
    expect(await publicImages()).toEqual(one);

    const many = Array.from({ length: 12 }, (_, i) => photo(i + 1));
    expect(
      (await updateAboutPageSectionAction(SECTION_KEY, { images: many })).ok,
    ).toBe(true);
    expect(await publicImages()).toEqual(many);
  });

  it("DROPS a blank row instead of storing or blocking on it", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    // "Add a row, then save without picking a photo" is the shape the admin UI
    // produces. It must be a no-op, not a validation error and not a stored "".
    const outcome = await updateAboutPageSectionAction(SECTION_KEY, {
      images: [photo(1), "", photo(2)],
    });

    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    expect(await storedImages()).toEqual([photo(1), photo(2)]);
  });

  it("stores an EMPTY list — that is how the gallery is taken off the page", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    expect(
      (await updateAboutPageSectionAction(SECTION_KEY, { images: [] })).ok,
    ).toBe(true);

    expect(await storedImages()).toEqual([]);
    expect(await publicImages()).toEqual([]);
  });

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  it("refuses a malformed URL and leaves the stored list untouched", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateAboutPageSectionAction(SECTION_KEY, { images: [photo(1)] });

    const outcome = await updateAboutPageSectionAction(SECTION_KEY, {
      images: [photo(1), "javascript:alert(1)"],
    });

    expect(outcome.ok).toBe(false);
    expect(await storedImages()).toEqual([photo(1)]);
  });
});
