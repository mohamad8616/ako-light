/**
 * Action tier — the project `i18nKey` is DERIVED, never sent by the form.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * The unit contract test (`tests/unit/admin/project-i18n-key.test.ts`) proves the
 * form and the schema no longer carry the field, and that the action contains the
 * derivation. It cannot prove the derivation RUNS correctly against a database.
 * The two ways this change can silently break are both only observable here:
 *
 *   1. CREATE — the column is NOT NULL, so a missing value is an insert failure,
 *      not a blank field;
 *   2. UPDATE — the form no longer sends the value, so an action that forgot to
 *      carry the stored one through would either blank a NOT NULL column or
 *      RE-DERIVE it from the new slug, quietly rewriting data it does not own.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the action modules, the repository, the database, the transaction.
 * STUBBED: only the admin session (authorization has its own suite —
 * `tests/unit/admin/actions/no-session-denied.test.ts`) and Next's request
 * context, exactly as `tests/server/slug-history-actions.test.ts` does.
 *
 * ISOLATION: `updateProjectAction` opens its OWN transaction (it passes no `db`),
 * so an outer rollback cannot contain it. Rows are committed and then removed in
 * `finally`, leaving the seeded dev database as it was found.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: { getSession: vi.fn().mockResolvedValue({ user: { role: "admin" } }) },
  },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  refresh: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

import { prisma } from "@/lib/db/prisma";
import { createProjectAction, updateProjectAction } from "@/lib/admin/actions/projects";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const PAIR = { en: "Probe project", fa: "پروژه آزمایشی" };

/**
 * A complete project payload — deliberately WITHOUT `i18nKey`.
 *
 * This is the compile-time half of the guarantee: the action's parameter type is
 * `ProjectFormValues`, so if `i18nKey` ever came back to the schema, an inline
 * literal here would stop type-checking.
 */
function projectInput(slug: string) {
  return {
    slug,
    name: PAIR,
    location: "Tehran",
    year: "2026",
    image: "/t.jpg",
    description: PAIR,
    paragraph: PAIR,
    moreDescription: [],
    credits: [],
    portfolioImages: [],
    sortOrder: 0,
    productIds: [],
  };
}

describeDb("project i18nKey — derived by the action", () => {
  it("derives `projects.<slug>` on CREATE", async () => {
    const slug = `proj-i18n-${randomUUID()}`;
    try {
      const created = await createProjectAction(projectInput(slug));
      expect(created.ok, JSON.stringify(created)).toBe(true);

      const row = await prisma.project.findUniqueOrThrow({ where: { id: slug } });
      expect(row.i18nKey).toBe(`projects.${slug}`);
    } finally {
      await prisma.project.deleteMany({ where: { id: slug } });
    }
  });

  it("PRESERVES the stored value on UPDATE — it is never re-derived", async () => {
    const slug = `proj-i18n-${randomUUID()}`;
    const renamed = `${slug}-v2`;
    try {
      const created = await createProjectAction(projectInput(slug));
      expect(created.ok, JSON.stringify(created)).toBe(true);
      expect(
        (await prisma.project.findUniqueOrThrow({ where: { id: slug } })).i18nKey,
      ).toBe(`projects.${slug}`);

      const updated = await updateProjectAction(slug, projectInput(renamed));
      expect(updated.ok, JSON.stringify(updated)).toBe(true);

      const row = await prisma.project.findUniqueOrThrow({ where: { id: slug } });
      expect(row.slug).toBe(renamed);
      // Re-deriving would have produced `projects.<renamed>`; preserving keeps
      // exactly the value the row already had.
      expect(row.i18nKey).toBe(`projects.${slug}`);
    } finally {
      // The rename records a slug_history row — clean it too.
      await prisma.slugHistory.deleteMany({ where: { entityId: slug } });
      await prisma.project.deleteMany({ where: { id: slug } });
    }
  });
});
