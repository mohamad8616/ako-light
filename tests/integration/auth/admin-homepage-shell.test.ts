/**
 * Pass D.1 — the new admin surfaces, over REAL HTTP through the in-process app.
 *
 * ── Why this tier ───────────────────────────────────────────────────────────
 *
 * The unit tests prove the schema and the routing helper; the server tests prove
 * the actions and the repository. Neither can catch the failure that matters
 * most here: a page that does not RENDER. A missing `case` in the slot switch,
 * a form importing something that is not a valid Server Action export, or a
 * label key that does not resolve all produce a broken admin screen while every
 * other tier stays green.
 *
 * ── What this file does NOT cover, and the measurement behind that ──────────
 *
 * It does not fetch the per-slot edit routes (`/admin/homepage/hero`,
 * `/admin/homepage/video`, …). Measured in this harness: EVERY `[slot]` route
 * answers **404 in ~700 ms** — including `/admin/homepage/catalogue`, which
 * existed long before this pass — while `/admin/users` answers **200** in the
 * same run. So the harness cannot exercise a two-dynamic-segment route at all,
 * and a test that asserted 200 there would fail for a reason that has nothing
 * to do with this pass. The slot pages are covered by `tsc` (the `[slot]` switch
 * is exhaustive over `HomepageSlotKey`), by the registry unit test, and by a
 * dev-server HTTP smoke test recorded in the pass report.
 *
 * Status codes and structural markup only — the admin dictionary travels inside
 * the RSC payload, so asserting on visible COPY would pass even when the control
 * never rendered.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanupFixture,
  closeDb,
  fetchPageWhenWarm,
  hasDatabaseUrl,
  registerUser,
  setUserFlags,
  signInAs,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueTestIp,
  type CookieJar,
  type TestUser,
} from "@/tests/helpers/auth-db";

/**
 * The in-process Next server COMPILES each admin route on first request, and the
 * admin graph is large (the whole sidebar, field kit, framer-motion, icons). On
 * this machine that exceeds the tier's 120 s default — the hub alone measured
 * over two minutes cold — so the budget is raised deliberately.
 */
vi.setConfig({ testTimeout: 300_000 });

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

async function signInAsRole(
  role: "user" | "admin" | "owner",
): Promise<{ user: TestUser; jar: CookieJar }> {
  const user = await registerUser();
  created.push(user);
  await setUserFlags(user.id, { role });
  const { jar } = await signInAs(user.email, user.password, {
    ip: uniqueTestIp(),
  });
  return { user, jar };
}

async function getPage(path: string, jar: CookieJar): Promise<Response> {
  const { origin } = await startAuthServer();
  return fetchPageWhenWarm(origin, path, jar);
}

describeAuth("Pass D.1 — the homepage hub and the admin shell navigation", () => {
  beforeAll(async () => {
    await startAuthServer();
  });

  afterAll(async () => {
    await cleanupFixture({
      userIds: created.map((user) => user.id),
      emails: created.map((user) => user.email),
    });
    await sweepRunRows();
    await stopAuthServer();
    await closeDb();
  });

  it("renders the hub, now that it lists seven slots", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage("/admin/homepage", jar);
    expect(response.status, `hub got ${response.status}`).toBe(200);
  });

  it("renders the hub in Persian too", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage("/fa/admin/homepage", jar);
    expect(response.status, `fa hub got ${response.status}`).toBe(200);
  });

  it("lets an OWNER open the hub as well", async () => {
    const { jar } = await signInAsRole("owner");
    const response = await getPage("/admin/homepage", jar);
    expect(response.status, `owner got ${response.status}`).toBe(200);
  });

  it("renders the language switcher in the admin header", async () => {
    const { jar } = await signInAsRole("admin");
    const html = await (await getPage("/admin/homepage", jar)).text();

    // Structural, not copy: the switcher is a group of real buttons whose
    // pressed state marks the active locale. `aria-pressed` exists nowhere else
    // in this shell, so it is a reliable signal that the control rendered.
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="group"');
  });

  /* ------------------------------------------------------------------ */
  /* Authorization — the page is not reachable by typing the URL          */
  /* ------------------------------------------------------------------ */

  it("does NOT let a CUSTOMER open the hub", async () => {
    const { jar } = await signInAsRole("user");
    const response = await getPage("/admin/homepage", jar);

    // requireAdminAccess redirects a non-admin to the localized sign-in page.
    expect([307, 302, 303]).toContain(response.status);
  });

  it("does NOT let an UNAUTHENTICATED visitor open it", async () => {
    const { origin } = await startAuthServer();
    const response = await fetch(new URL("/admin/homepage", origin), {
      redirect: "manual",
    });

    expect([307, 302, 303]).toContain(response.status);
  });
});
