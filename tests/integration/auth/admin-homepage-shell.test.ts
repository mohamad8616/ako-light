/**
 * Pass D.1 — the new admin surfaces, over REAL HTTP through the in-process app.
 *
 * ── Why this tier ───────────────────────────────────────────────────────────
 *
 * The unit tests prove the schema, the routing helper and the page's static
 * shape; the server tests prove the actions and the repository. Neither can
 * catch the failure that matters most here: a page that does not RENDER. A
 * section whose form is not wired up, a form importing something that is not a
 * valid Server Action export, or a label key that does not resolve all produce
 * a broken admin screen while every other tier stays green.
 *
 * ── What this file does NOT cover, and the measurement behind that ──────────
 *
 * `/admin/homepage` used to be a hub of cards, each linking to its own
 * `/admin/homepage/[slot]` edit view. Those per-slot routes are GONE — the
 * sections are stacked on the single page now — so this file no longer has any
 * reason to reach for them. (It never could anyway: measured in this harness,
 * EVERY two-dynamic-segment route answers 404 in ~700 ms while `/admin/users`
 * answers 200 in the same run, so the harness cannot exercise such a route at
 * all.) The stacked page's composition is covered by `tsc` (the section→form map
 * is exhaustive over `HomepageSlotKey`) and by
 * tests/unit/admin/homepage.test.ts, which scans the page statically.
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

describeAuth("Pass D.1 — the homepage editor and the admin shell navigation", () => {
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

  it("renders the single-page editor, which stacks all seven sections", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage("/admin/homepage", jar);
    expect(response.status, `editor got ${response.status}`).toBe(200);
  });

  it("renders the editor in Persian too", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage("/fa/admin/homepage", jar);
    expect(response.status, `fa editor got ${response.status}`).toBe(200);
  });

  it("lets an OWNER open the editor as well", async () => {
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

  it("does NOT let a CUSTOMER open the editor", async () => {
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
