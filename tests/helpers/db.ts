/**
 * Shared helpers for the database-backed test tiers (Pass 9.5 integration +
 * Pass 10.5 server).
 *
 * Unlike tests/unit, these tiers intentionally talk to the real seeded dev
 * database. They run read-only so they are safe to execute against the
 * database the dev server is also using. When DATABASE_URL is not available in
 * the test environment the tiers skip with a clear message instead of failing
 * opaquely.
 */
import "dotenv/config";
import ReactServer from "react";
import { expect } from "vitest";

/** True when the dev database is configured for the test environment. */
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/**
 * Asserts a jsonb-backed `Localized` column parsed back into a real
 * `{ en, fa }` object with non-empty strings — the same guarantee the
 * tests/unit/data tests enforce on the static files, enforced on the DB copy.
 * (A raw string or `{"en":"…","fa":null}` would fail here.)
 */
export function expectLocalized(value: unknown, label: string): void {
  expect(value, `${label}: expected an object`).toBeTypeOf("object");
  expect(value, `${label}: null`).not.toBeNull();
  const { en, fa } = value as { en?: unknown; fa?: unknown };
  expect(en, `${label}.en`).toBeTypeOf("string");
  expect(en as string, `${label}.en non-empty`).not.toHaveLength(0);
  expect(fa, `${label}.fa`).toBeTypeOf("string");
  expect(fa as string, `${label}.fa non-empty`).not.toHaveLength(0);
}

/** Asserts a jsonb-backed `Localized[]` column (e.g. `Designer.bio`). */
export function expectLocalizedList(value: unknown, label: string): void {
  expect(Array.isArray(value), `${label}: expected an array`).toBe(true);
  (value as unknown[]).forEach((entry, i) =>
    expectLocalized(entry, `${label}[${i}]`),
  );
}

/**
 * Asserts an entity carries *exactly* the interface's keys — the repository
 * mappers assign every key (optional ones may hold `undefined`, but the key is
 * always present), so key sets pin the shape to the lib/data interfaces.
 */
export function expectKeys(
  entity: unknown,
  keys: readonly string[],
  label: string,
): void {
  expect(entity, `${label}: expected an object`).toBeTypeOf("object");
  expect(entity, `${label}: null`).not.toBeNull();
  expect(
    Object.keys(entity as object).sort(),
    `${label}: key set`,
  ).toEqual([...keys].sort());
}

type ServerInternals = { A: unknown };

/** React's private RSC internals, exposed by the react-server build. */
const serverInternals = (
  ReactServer as unknown as {
    __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: ServerInternals;
  }
).__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

/**
 * Runs `run()` inside a simulated React request cache scope.
 *
 * React's `cache()` only memoizes while the RSC dispatcher is installed (i.e.
 * during a server render / Server Action). Plain Vitest runs have no
 * dispatcher, so this installs a minimal one — `getCacheForType` returning one
 * cache root per simulated request — around `run()` and restores the previous
 * state afterwards. The assertions inside `run()` therefore exercise the REAL
 * react-server `cache` implementation the repositories are wrapped in, not a
 * mock of it.
 */
export async function withRequestCache<T>(run: () => Promise<T>): Promise<T> {
  if (!serverInternals) {
    throw new Error(
      "withRequestCache requires the react-server build; the tests/server " +
        "project must alias react to react.react-server.js (see vitest.config.ts)",
    );
  }

  const previous = serverInternals.A;
  const cacheRoots = new Map<() => unknown, unknown>();
  serverInternals.A = {
    getCacheForType: (create: () => unknown) => {
      let cacheRoot = cacheRoots.get(create);
      if (!cacheRoot) {
        cacheRoot = create();
        cacheRoots.set(create, cacheRoot);
      }
      return cacheRoot;
    },
  };
  try {
    return await run();
  } finally {
    serverInternals.A = previous;
  }
}
