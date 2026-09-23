# Admin Dashboard — Usage Guide

> **Living document.** This file describes the admin dashboard as it exists
> today: the catalog-shell work is complete, the dashboard is live, and the
> remaining actions are validation and environment cleanup rather than feature
> discovery.

## Current status at a glance

| Area                                               | State                                          |
| -------------------------------------------------- | ---------------------------------------------- |
| Admin shell (sidebar + topbar + responsive drawer) | Working                                        |
| Dashboard overview (stat cards + heading)          | Working                                        |
| Catalog sections (Products, Designers, …)          | CRUD screens implemented for the catalog stack |
| Admins section (owner only)                        | Placeholder route remains; owner gate enforced |
| Sign-in gate for `/admin`                          | Working                                        |

## Access & sign-in

- Admin URLs: `/fa/admin` and `/en/admin` (the admin shell is rendered RTL in
  both locales — the dashboard is a Persian-first, RTL interface).
- Sign in at `/sign-in` (or `/fa/sign-in`, `/en/sign-in`).
- **Who may use the dashboard:** only accounts whose role is `admin` or
  `owner` (see `lib/auth/permissions.ts` — both roles are in `ADMIN_ROLES`;
  `owner` outranks `admin`).
- If you are not signed in, opening any `/admin` URL redirects you to the
  sign-in page and returns you to the original admin URL after login
  (`?redirectTo=…`, enforced by `proxy.ts`).
- There is currently **no seeded demo account and no in-dashboard UI for
  granting roles** — an account receives the `admin`/`owner` role through the
  database / Better Auth admin tooling, not through the dashboard. The
  "Admins" screen that will manage this is itself still a placeholder.

## Dashboard overview (`/admin`)

The dashboard is a read-only operational snapshot:

- A heading ("Overview") with a short subtitle.
- **Six stat cards**: Products, Designers, Collections, Materials,
  Flagships, Projects — each showing the current count of that entity from
  the database.
- The card grid is responsive: one column on phones, two columns from `md`,
  three columns from `xl`.
- A chart and demo table also render under the stat cards while preserving the
  shared shell chrome.

The dashboard is informational; create/edit/delete actions live on the
individual catalog section pages.

## Navigation

**Sidebar** (left side of the shell; collapses to an overlay drawer on mobile
via the topbar's toggle button):

- **Catalog** group — visible to every `admin`/`owner`:
  - Dashboard
  - Products
  - Categories
  - Designers
  - Collections
  - Materials
  - Flagships
  - Projects
  - Fabrics
  - Catalogue
- **Admins** — visible **only to the `owner` role**.

**Topbar** (generic chrome only — it never renders a page's heading):

- Sidebar toggle (works at every width; on phones it opens the drawer).
- A breadcrumb showing the current section (e.g. `Admin / Products`),
  derived automatically from the URL.
- The signed-in user's name pill and a **Sign out** button.

Each page's own body renders its single heading; the topbar deliberately does
not, so there is exactly one heading per page.

## Catalog sections

Each catalog section follows the shared admin shell and table form conventions.
The CRUD pages use shared schema/action layers and the section-specific DataTable
or form layout depending on the entity. A route remains intentionally simple for
owner-only access and a dedicated placeholder for the Admins page.

<!-- Placeholder headings below — each gains real usage instructions when its
     CRUD screens are built. Do not pre-write instructions for unbuilt UI. -->

### Products — usage instructions pending

### Categories — usage instructions pending

### Designers — usage instructions pending

### Collections — usage instructions pending

### Materials — usage instructions pending

### Flagships — usage instructions pending

### Projects — usage instructions pending

### Fabrics — usage instructions pending

### Catalogue — usage instructions pending

### Admins (owner only) — usage instructions pending

## Known current limitations

- The public site chrome (navbar, preloader, footer, newsletter) still wraps
  the admin area; a structural fix is planned and tracked separately.
- The role check for signed-in users inside `proxy.ts` is enforced and denies
  non-admin roles while preserving the sign-in redirect behavior for anonymous
  users.
- The sidebar's active-item state and the shell's RTL direction are forced
  from `ADMIN_SHELL_DIR`, by design.

## Where the code lives

| Concern                                     | File                                         |
| ------------------------------------------- | -------------------------------------------- |
| Section registry (hrefs + translation keys) | `lib/admin/sections.ts`                      |
| Admin shell layout                          | `app/[locale]/(admin)/admin/layout.tsx`      |
| Sidebar / shell chrome                      | `components/app-sidebar.tsx`                 |
| Shell direction source                      | `lib/admin/sections.ts`                      |
| Placeholder route (owner-only)              | `app/[locale]/(admin)/admin/admins/page.tsx` |
| Admin translations (en/fa)                  | `lib/i18n/translations/admin.ts`             |
| Shared catalog CRUD widgets                 | `components/admin/catalog/**`                |
