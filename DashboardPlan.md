# Admin Dashboard Plan

## Goal

Build the admin dashboard shell for Ako Light using the project's existing App Router, Better Auth admin roles, and locale-aware route structure. The work is intentionally modeled on the shadcn-admin pattern, but adapted to this repository instead of copying a Vite/TanStack Router template.

## Phase A — Security first

- Close the real gap in `proxy.ts`: any route under `/admin` must verify an authenticated session and an admin-level role.
- Keep the unauthenticated redirect to `/sign-in?redirectTo=...`.
- Redirect signed-in non-admin users to `/` instead of sending them back through sign-in.
- Read the role from the Better Auth session payload (`session.user.role`) rather than performing an extra fetch in this version.

## Phase B — Dependencies and shell primitives

- Confirm the sidebar primitive is present before adding anything.
- Maintain the existing shadcn primitive if it already exists; otherwise add it fresh.
- Install the dashboard/data-table dependencies needed for the admin shell and future CRUD screens.

## Phase C — Admin layout

- Create a dedicated `app/[locale]/admin/layout.tsx` that is independent from the public site chrome.
- Force the admin shell to `dir="rtl"` even for `/en/admin` paths, using the sidebar's RTL support instead of a CSS hack.
- Keep the layout theme-rooted in the existing CSS variables already defined in `app/globals.css`.

## Phase D — Navigation and topbar

- Add an `AdminSidebar` with collapsible grouped navigation.
- Add `AdminTopbar` with the current user name and sign-out action via `authClient.signOut()`.
- Wire `sonner`'s `Toaster` into the admin layout for future feedback.

## Phase E — Reusable data-table foundation

- Add a generic `DataTable` scaffold for sorting, pagination, and a filter slot.
- Keep it entity-agnostic so future CRUD pages can consume it directly.

## Phase F — Role-gated navigation

- Show the Catalog group to both admin and owner roles.
- Show the owner-only Admins section only to `owner`.
- Create placeholder pages for catalog sections and the owner-only admin area.

## Phase G — Overview dashboard

- Add an overview dashboard under `app/[locale]/admin/page.tsx`.
- Show counts for products, designers, collections, materials, flagships, and projects.
- Use lightweight `count()` queries instead of loading entire tables.

## Phase H — i18n and verification

- Add admin strings to `lib/i18n/translations/admin.ts` and register them in the translation index.
- Verify the admin guard with unit tests.
- Run the required compile and build checks before reporting completion.

## Current status

Security guard and admin-role check are in place, and the dashboard scaffolding is being added around the existing project structure rather than trying to replace the app's public layout or auth model.
