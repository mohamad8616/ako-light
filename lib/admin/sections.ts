import { stripLocalePrefix } from "@/lib/i18n/routing";

/**
 * Admin navigation registry — the single source of truth for the admin
 * section list.
 *
 * Both consumers read from here so they can never drift:
 *   - the sidebar (components/admin/AdminSidebar.tsx) renders these as its
 *     menu items, pairing each `href` with an icon locally;
 *   - the topbar (components/admin/AdminTopbar.tsx) resolves the *current*
 *     section from `usePathname()` to label its breadcrumb.
 *
 * Instructions:
 *   - Keep this a pure data module: no React, no icon components, no
 *     "use client". The sidebar owns the icon map, exactly like
 *     lib/i18n/translations/* owns copy while components own markup.
 *   - `labelKey` values must exist in BOTH dictionaries of
 *     lib/i18n/translations/admin.ts — tests/unit/i18n/translations.test.ts
 *     fails the suite if the en/fa key sets diverge.
 *   - `href` values are canonical (locale-less): the `Link` from
 *     lib/i18n/Link.tsx adds the `/en` prefix at render time.
 */

/** The admin shell is RTL regardless of the `/en` prefix (forced in the layout). */
export const ADMIN_SHELL_DIR = "rtl";

/** The dashboard route, and the only nav item that matches itself exactly. */
export const ADMIN_DASHBOARD_HREF = "/admin";

export interface AdminNavItem {
  /** Canonical route — see `AdminNavItem.href` notes on the module above. */
  href: string;
  /** Translation key, not the label itself. */
  labelKey: string;
}

/** Catalog sections — visible to every admin-level role. */
export const ADMIN_CATALOG_NAV: readonly AdminNavItem[] = [
  { href: ADMIN_DASHBOARD_HREF, labelKey: "admin.nav.dashboard" },
  { href: "/admin/products", labelKey: "admin.nav.products" },
  { href: "/admin/categories", labelKey: "admin.nav.categories" },
  { href: "/admin/designers", labelKey: "admin.nav.designers" },
  { href: "/admin/collections", labelKey: "admin.nav.collections" },
  { href: "/admin/materials", labelKey: "admin.nav.materials" },
  { href: "/admin/flagships", labelKey: "admin.nav.flagships" },
  { href: "/admin/projects", labelKey: "admin.nav.projects" },
  { href: "/admin/fabrics", labelKey: "admin.nav.fabrics" },
  { href: "/admin/catalogue", labelKey: "admin.nav.catalogue" },
];

/** Owner-only sections (see lib/auth/permissions.ts). */
export const ADMIN_OWNER_NAV: readonly AdminNavItem[] = [
  { href: "/admin/admins", labelKey: "admin.nav.admins" },
];

/** Every known section. Order is irrelevant: lookups are by longest prefix. */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  ...ADMIN_CATALOG_NAV,
  ...ADMIN_OWNER_NAV,
];

/**
 * `/fa` is never a canonical browser URL — proxy.ts 308-redirects it to the
 * unprefixed form — but a rewritten request can surface internally as
 * `/fa/admin/...`. The previous sidebar handled that case explicitly, so the
 * lookup tolerates it here rather than silently losing the active state.
 */
const INTERNAL_FA_PREFIX = /^\/fa(?=\/|$)/;

/**
 * The locale-less, trailing-slash-free form of a live pathname, so the
 * browser's `/en/admin/products`, a rewritten `/fa/admin/products`, and the
 * canonical `/admin/products` all behave identically (the URL is the source
 * of truth for locale — see lib/i18n/routing.ts).
 */
function canonicalPath(pathname: string): string {
  const path = stripLocalePrefix(pathname).replace(INTERNAL_FA_PREFIX, "");
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Whether a nav item should render as active for the given pathname.
 *
 * The dashboard href (`/admin`) is an exact match only — otherwise it would
 * stay highlighted on every child route. Every other item also matches its
 * own descendants, so future detail routes such as `/admin/products/<id>`
 * keep the parent item active without any extra entry.
 */
export function isAdminNavItemActive(href: string, pathname: string): boolean {
  const path = canonicalPath(pathname);
  if (path === href) return true;
  return href !== ADMIN_DASHBOARD_HREF && path.startsWith(`${href}/`);
}

/**
 * The section that owns `pathname`, or `undefined` for an unknown path
 * (the topbar then falls back to its root crumb alone).
 *
 * Longest match wins, which keeps nested routes resolving to their real
 * section rather than to `/admin`.
 */
export function getAdminNavItem(pathname: string): AdminNavItem | undefined {
  let match: AdminNavItem | undefined;

  for (const item of ADMIN_NAV_ITEMS) {
    if (!isAdminNavItemActive(item.href, pathname)) continue;
    if (!match || item.href.length > match.href.length) match = item;
  }

  return match;
}