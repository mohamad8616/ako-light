/**
 * Cache tags shared between the readers that POPULATE a cache entry and the
 * admin actions that EXPIRE it.
 *
 * They live in their own dependency-free module on purpose. The alternative —
 * importing the constant from the repository that uses it — drags Prisma and
 * `next/cache` into every consumer, including `lib/admin/revalidate.ts` and the
 * unit test that mocks `next/cache` and would then fail on an unmocked module.
 * A tag is a string shared by two sides; it needs no behaviour of its own.
 */

/**
 * The navigation menu rows (`getNavCategories`).
 *
 * The (site) layout reads them on every public page, so they are cached across
 * requests; a category create/update/delete must expire that entry or the nav
 * keeps rendering the old name and order.
 */
export const NAV_CATEGORIES_TAG = "nav-categories";
