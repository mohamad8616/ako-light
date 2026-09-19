# Admin Dashboard — Usage Guide

> **Living document.** This file describes the admin dashboard **as it exists
> right now** — no planned features. Every catalog section below is currently
> a placeholder screen; detailed per-section usage instructions will be added
> to this document as each section's CRUD screens are built.

## Current status at a glance

| Area | State |
| --- | --- |
| Admin shell (sidebar + topbar + responsive drawer) | Working |
| Dashboard overview (stat cards) | Working |
| Catalog sections (Products, Designers, …) | Placeholder "coming soon" screens |
| Admins section (owner only) | Placeholder "coming soon" screen |
| Sign-in gate for `/admin` | Working (unauthenticated users are redirected) |

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

No create/edit/delete actions exist on the dashboard yet — it is purely
informational.

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

## Catalog sections (all placeholders)

Every section below currently shows the shared "Coming soon" placeholder
screen (section name as the page heading, a centered card, and a "Back to
dashboard" link). No data can be created, edited, or deleted from these
screens yet.

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
- The role check for signed-in users inside `proxy.ts` is currently disabled
  (only the *authentication* gate is active), so any signed-in user can reach
  admin pages until it is re-enabled.
- The sidebar's active-item state and the shell's RTL direction are forced
  regardless of the `/en` URL prefix, by design.

## Where the code lives

| Concern | File |
| --- | --- |
| Section registry (hrefs + translation keys) | `lib/admin/sections.ts` |
| Admin shell layout | `app/[locale]/(admin)/admin/layout.tsx` |
| Sidebar | `components/admin/AdminSidebar.tsx` |
| Topbar (toggle, breadcrumb, sign out) | `components/admin/AdminTopbar.tsx` |
| Placeholder screen | `components/admin/AdminPlaceholderPage.tsx` |
| Admin translations (en/fa) | `lib/i18n/translations/admin.ts` |
