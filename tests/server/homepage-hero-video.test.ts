/**
 * Pass D.1 — the hero and video-section slots, driven through the REAL actions.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Unit tests can prove the schema rejects a bad URL and that the field renders
 * the right element, but the three things an operator actually depends on are
 * only demonstrable end to end:
 *
 *   1. an ADMIN can save, and a CUSTOMER or an anonymous caller cannot;
 *   2. what was saved is what the PUBLIC repository hands back — both
 *      languages, and the built-in fallback when a field is cleared;
 *   3. clearing really restores the built-in, i.e. it writes SQL NULL rather
 *      than an empty string that would render as a blank hero line.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the action modules, the repositories, `@/lib/auth/auth`, the database,
 * and the session cookie — minted by a real `auth.api.signInEmail` call.
 *
 * STUBBED: only Next's request context. `headers()` points at that real cookie;
 * `next/cache` is a no-op because `revalidatePath` throws outside a request.
 *
 * ── Data safety ────────────────────────────────────────────────────────────
 *
 * Both slots are singletons that would carry the operator's real content. This
 * file snapshots whatever rows exist before it runs, deletes them between
 * tests, and restores the snapshot afterwards — then re-reads to prove it.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  updateHeroFeatureAction,
  updateVideoFeatureAction,
} from "@/lib/admin/actions/homepage";
import { auth } from "@/lib/auth/auth";
import {
  getHeroFeature,
  getVideoFeature,
} from "@/lib/repositories/homepage-features";

const describeDb = describe.skipIf(!hasDatabaseUrl);

type HeroRow = {
  id: string;
  enabled: boolean;
  videoUrl: string | null;
  posterUrl: string | null;
  firstLine: unknown;
  secondLine: unknown;
  ctaLabel: unknown;
  ctaHref: string | null;
};

type VideoRow = {
  id: string;
  enabled: boolean;
  videoUrl: string | null;
};

let heroSnapshot: HeroRow | null = null;
let videoSnapshot: VideoRow | null = null;

const readHero = async (): Promise<HeroRow | null> =>
  (await query<HeroRow>(`SELECT * FROM hero_feature WHERE id = 'hero'`))[0] ??
  null;

const readVideo = async (): Promise<VideoRow | null> =>
  (await query<VideoRow>(`SELECT * FROM video_feature WHERE id = 'video'`))[0] ??
  null;

/** The form's "cleared" shape: every override empty. */
const clearedHero = {
  enabled: true,
  videoUrl: "",
  posterUrl: "",
  firstLine: { en: "", fa: "" },
  secondLine: { en: "", fa: "" },
  ctaLabel: { en: "", fa: "" },
  ctaHref: "",
};

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

describeDb("Pass D.1 — hero and video slots", () => {
  beforeAll(async () => {
    heroSnapshot = await readHero();
    videoSnapshot = await readVideo();
  });

  beforeEach(async () => {
    state.cookieHeader = "";
    // Each test starts from "the slot was never saved", which is also the
    // state the public page must render the built-ins from.
    await query(`DELETE FROM hero_feature WHERE id = 'hero'`);
    await query(`DELETE FROM video_feature WHERE id = 'video'`);
  });

  afterEach(async () => {
    await query(`DELETE FROM hero_feature WHERE id = 'hero'`);
    await query(`DELETE FROM video_feature WHERE id = 'video'`);
  });

  afterAll(async () => {
    // Put the operator's rows back exactly as they were.
    if (heroSnapshot) {
      await query(
        `INSERT INTO hero_feature (id, enabled, "videoUrl", "posterUrl", "firstLine", "secondLine", "ctaLabel", "ctaHref", "createdAt", "updatedAt")
         VALUES ('hero', $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, now(), now())
         ON CONFLICT (id) DO UPDATE SET enabled = $1, "videoUrl" = $2, "posterUrl" = $3,
           "firstLine" = $4::jsonb, "secondLine" = $5::jsonb, "ctaLabel" = $6::jsonb, "ctaHref" = $7`,
        [
          heroSnapshot.enabled,
          heroSnapshot.videoUrl,
          heroSnapshot.posterUrl,
          heroSnapshot.firstLine === null ? null : JSON.stringify(heroSnapshot.firstLine),
          heroSnapshot.secondLine === null ? null : JSON.stringify(heroSnapshot.secondLine),
          heroSnapshot.ctaLabel === null ? null : JSON.stringify(heroSnapshot.ctaLabel),
          heroSnapshot.ctaHref,
        ],
      );
    }
    if (videoSnapshot) {
      await query(
        `INSERT INTO video_feature (id, enabled, "videoUrl", "createdAt", "updatedAt")
         VALUES ('video', $1, $2, now(), now())
         ON CONFLICT (id) DO UPDATE SET enabled = $1, "videoUrl" = $2`,
        [videoSnapshot.enabled, videoSnapshot.videoUrl],
      );
    }

    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ---------------------------------------------------------------- */
  /* The fallback: an unsaved slot renders the built-ins               */
  /* ---------------------------------------------------------------- */

  it("returns null before anything is saved, so the components keep their built-ins", async () => {
    expect(await getHeroFeature()).toBeNull();
    expect(await getVideoFeature()).toBeNull();
  });

  /* ---------------------------------------------------------------- */
  /* Authorization                                                     */
  /* ---------------------------------------------------------------- */

  it("refuses an UNAUTHENTICATED hero save", async () => {
    await expect(updateHeroFeatureAction(clearedHero)).rejects.toThrow();
    expect(await readHero()).toBeNull();
  });

  it("refuses a CUSTOMER's hero save, even with a valid session", async () => {
    const customer = await accountWithSession("user");
    state.cookieHeader = customer.cookie;

    await expect(updateHeroFeatureAction(clearedHero)).rejects.toThrow();
    expect(await readHero()).toBeNull();
  });

  it("refuses an UNAUTHENTICATED video save", async () => {
    await expect(
      updateVideoFeatureAction({ enabled: true, videoUrl: "" }),
    ).rejects.toThrow();
    expect(await readVideo()).toBeNull();
  });

  it("refuses a CUSTOMER's video save", async () => {
    const customer = await accountWithSession("user");
    state.cookieHeader = customer.cookie;

    await expect(
      updateVideoFeatureAction({ enabled: true, videoUrl: "" }),
    ).rejects.toThrow();
    expect(await readVideo()).toBeNull();
  });

  /* ---------------------------------------------------------------- */
  /* Hero — the round trip                                             */
  /* ---------------------------------------------------------------- */

  it("lets an ADMIN save hero content, and the public read returns it", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await updateHeroFeatureAction({
      enabled: true,
      videoUrl: "https://bucket.liara.space/media/homepage/hero.mp4",
      posterUrl: "/media/legacy-poster.jpg",
      firstLine: { en: "2026 Collection", fa: "کلکسیون ۲۰۲۶" },
      secondLine: { en: "Ritual Gravity", fa: "ریچوال گرویتی" },
      ctaLabel: { en: "Read more", fa: "بیشتر بخوانید" },
      ctaHref: "/catalogue",
    });
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    const resolved = await getHeroFeature();
    expect(resolved).not.toBeNull();
    // Both languages survive the round trip — the component picks per language.
    expect(resolved!.firstLine).toEqual({
      en: "2026 Collection",
      fa: "کلکسیون ۲۰۲۶",
    });
    expect(resolved!.secondLine).toEqual({
      en: "Ritual Gravity",
      fa: "ریچوال گرویتی",
    });
    expect(resolved!.ctaLabel).toEqual({
      en: "Read more",
      fa: "بیشتر بخوانید",
    });
    expect(resolved!.videoUrl).toBe(
      "https://bucket.liara.space/media/homepage/hero.mp4",
    );
    expect(resolved!.posterUrl).toBe("/media/legacy-poster.jpg");
    expect(resolved!.ctaHref).toBe("/catalogue");
  });

  it("lets an OWNER save hero content too", async () => {
    const owner = await accountWithSession("owner");
    state.cookieHeader = owner.cookie;

    const outcome = await updateHeroFeatureAction({
      ...clearedHero,
      firstLine: { en: "Owner line", fa: "خط مدیر" },
    });
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    expect((await getHeroFeature())!.firstLine).toEqual({
      en: "Owner line",
      fa: "خط مدیر",
    });
  });

  it("writes SQL NULL for a cleared field, so the built-in comes back", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateHeroFeatureAction({
      ...clearedHero,
      firstLine: { en: "Set", fa: "تنظیم" },
      ctaHref: "/somewhere",
    });
    expect((await getHeroFeature())!.firstLine).not.toBeNull();

    // Clear both again.
    const outcome = await updateHeroFeatureAction(clearedHero);
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    const row = await readHero();
    // NULL, not "": an empty string would render a blank line instead of
    // falling back to the dictionary copy.
    expect(row!.firstLine).toBeNull();
    expect(row!.ctaLabel).toBeNull();
    expect(row!.ctaHref).toBeNull();
    expect(row!.videoUrl).toBeNull();

    const resolved = await getHeroFeature();
    expect(resolved!.firstLine).toBeNull();
    expect(resolved!.ctaHref).toBeNull();
    expect(resolved!.videoUrl).toBeNull();
  });

  it("rejects an UNSAFE button destination and changes NOTHING", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateHeroFeatureAction({ ...clearedHero, ctaHref: "/keep-me" });
    const before = await readHero();

    for (const ctaHref of [
      "javascript:alert(1)",
      "data:text/html,x",
      "ftp://example.com/x",
      "not a url",
    ]) {
      const outcome = await updateHeroFeatureAction({ ...clearedHero, ctaHref });
      expect(outcome.ok, ctaHref).toBe(false);
      if (!outcome.ok) {
        expect(outcome.issues.map((i) => `${i.field}:${i.code}`), ctaHref).toContain(
          "ctaHref:invalidLink",
        );
      }
    }

    expect((await readHero())!.ctaHref).toBe(before!.ctaHref);
    expect((await readHero())!.ctaHref).toBe("/keep-me");
  });

  it("rejects a half-translated headline and changes NOTHING", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await updateHeroFeatureAction({
      ...clearedHero,
      firstLine: { en: "Only English", fa: "" },
    });
    expect(outcome.ok).toBe(false);
    expect(await readHero()).toBeNull();
  });

  it("honours `enabled: false` — the repository reports it so the hero can hide", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateHeroFeatureAction({ ...clearedHero, enabled: false });
    expect((await getHeroFeature())!.enabled).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /* Video section — the round trip                                    */
  /* ---------------------------------------------------------------- */

  it("lets an ADMIN set the section video, and the public read returns it", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const url = "https://bucket.liara.space/media/homepage/afterhenge.mp4";
    const outcome = await updateVideoFeatureAction({ enabled: true, videoUrl: url });
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    expect((await readVideo())!.videoUrl).toBe(url);
    expect((await getVideoFeature())!.videoUrl).toBe(url);
  });

  it("clears the video back to the built-in asset", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateVideoFeatureAction({
      enabled: true,
      videoUrl: "https://bucket.liara.space/media/homepage/x.mp4",
    });
    expect((await getVideoFeature())!.videoUrl).not.toBeNull();

    const outcome = await updateVideoFeatureAction({ enabled: true, videoUrl: "" });
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);

    // NULL means "no video" — the stock fallback asset was deleted by the
    // operator, so the component renders nothing for this section.
    expect((await readVideo())!.videoUrl).toBeNull();
    expect((await getVideoFeature())!.videoUrl).toBeNull();
  });

  it("rejects an invalid media reference and changes NOTHING", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await updateVideoFeatureAction({
      enabled: true,
      videoUrl: "/media/legacy-video.mp4",
    });

    for (const videoUrl of ["javascript:alert(1)", "not a url"]) {
      const outcome = await updateVideoFeatureAction({ enabled: true, videoUrl });
      expect(outcome.ok, videoUrl).toBe(false);
      if (!outcome.ok) {
        expect(outcome.issues.map((i) => i.field), videoUrl).toContain("videoUrl");
      }
    }

    expect((await readVideo())!.videoUrl).toBe("/media/legacy-video.mp4");
  });
});
