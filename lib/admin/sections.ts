import { stripLocalePrefix } from "@/lib/i18n/routing";

/**
 * Admin navigation registry — the single source of truth for the admin
 * section list.
 *
 * Consumers read from here so they can never drift:
 *   - the sidebar (components/admin/app-sidebar.tsx) renders these as its
 *     menu items, pairing each `href` with an icon locally, and uses
 *     isAdminNavItemActive() to highlight the current section;
 *   - getAdminNavItem() resolves the *current* section from `usePathname()`
 *     for breadcrumb-style labels.
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

/** A text direction. */
export type AdminDir = "ltr" | "rtl";

/**
 * The admin shell's direction.
 *
 * RTL for EVERY locale, including the unprefixed English `/admin`. That is
 * deliberate, not an oversight: the shared sidebar's fixed layer relies on
 * physical left/right positioning, so an LTR shell would dock the sidebar on
 * the left, which is not the layout this dashboard is designed around.
 *
 * ── The consequence this file used to get wrong ─────────────────────────────
 *
 * An RTL paragraph gives trailing NEUTRAL characters — a sentence's final
 * period, a semicolon, a closing bracket — the PARAGRAPH direction. So an
 * English description inside the RTL shell rendered with its full stop at the
 * LEFT end, and read as though its clauses were reversed. The fix is NOT to
 * change the shell (that would move the sidebar); it is to isolate the TEXT:
 * see `AdminText` in components/admin/AdminText.tsx, which every admin string
 * primitive now renders through.
 */
export const ADMIN_SHELL_DIR: AdminDir = "rtl";

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
  // Site configuration rather than a catalog table, but every admin-level role
  // edits the homepage banners, so it sits with the dashboard at the top.
  { href: "/admin/homepage", labelKey: "admin.nav.homepage" },
  // The About and S34 pages own prose section rows rather than catalog entities
  // (myPlan.md Part D), so they are configuration sections like the homepage.
  { href: "/admin/about", labelKey: "admin.nav.about" },
  { href: "/admin/s34", labelKey: "admin.nav.s34" },
  // Global site configuration (Pass 13.5D): brand assets, contact details and
  // social links. It sits with the other configuration sections rather than
  // with the catalog tables, because it has no rows of its own.
  { href: "/admin/settings", labelKey: "admin.nav.settings" },
  // Orders are a commercial section rather than catalog content, but they sit
  // with the rest of the operational tables: every admin-level role views them
  // and moves their fulfillment status (payment status is never editable here —
  // it changes only through ZarinPal's verify() callback).
  { href: "/admin/orders", labelKey: "admin.nav.orders" },
  // The shared user directory: visible to every admin-level role, because BOTH
  // admin and owner may review customers and moderate (ban/unban) accounts.
  // The role-change control inside it is owner-only, but that is enforced
  // server-side per action — not by hiding this entry. Staff/role management
  // proper stays on the owner-only `/admin/admins` (ADMIN_OWNER_NAV below).
  { href: "/admin/users", labelKey: "admin.nav.users" },
  { href: "/admin/products", labelKey: "admin.nav.products" },
  { href: "/admin/categories", labelKey: "admin.nav.categories" },
  { href: "/admin/designers", labelKey: "admin.nav.designers" },
  { href: "/admin/collections", labelKey: "admin.nav.collections" },
  { href: "/admin/materials", labelKey: "admin.nav.materials" },
  { href: "/admin/flagships", labelKey: "admin.nav.flagships" },
  { href: "/admin/projects", labelKey: "admin.nav.projects" },
  { href: "/admin/fabrics", labelKey: "admin.nav.fabrics" },
  { href: "/admin/catalogue", labelKey: "admin.nav.catalogue" },
  // The media library is not a catalog entity: it is the shared store every
  // other section's image fields will eventually reference (Pass 13.5C). It
  // sits last in the group for that reason — it belongs to all of them rather
  // than beside any one of them.
  { href: "/admin/media", labelKey: "admin.nav.media" },
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
 * The locale-less, trailing-slash-free form of a live pathname, so the
 * browser's `/fa/admin/products`, a legacy `/en/admin/products`, and the
 * canonical `/admin/products` all behave identically (the URL is the source
 * of truth for locale — see lib/i18n/routing.ts).
 *
 * `stripLocalePrefix` removes BOTH known prefixes, so this needs no
 * locale-specific handling of its own: whichever language is default, the
 * prefixed form of the other one normalizes to the same canonical path.
 */
function canonicalPath(pathname: string): string {
  return stripLocalePrefix(pathname).replace(/\/+$/, "") || "/";
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