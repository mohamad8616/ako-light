the prompt: 
Build the admin dashboard shell for ako-light-cline, modeled structurally
on the satnaing/shadcn-admin template's sidebar/topbar/dashboard patterns
(collapsible grouped sidebar, data-table toolkit foundation, stat-card +
chart dashboard) — rebuilt natively for Next.js App Router and wired to
this project's existing better-auth setup and i18n system, not copied
file-for-file (that template is Vite + TanStack Router + Clerk; none of
that applies here). Verify the current state of proxy.ts and
lib/auth/permissions.ts against what's described below before assuming it
matches; report any discrepancy rather than silently working around it.

PART A — close the role-gating gap (do this first, real security gap)

1. proxy.ts's /admin check currently only verifies a session exists, not
   that the user holds an admin-level role. Fix: for any path under
   /admin, after confirming a session exists, check the role via the
   ROLES/ADMIN_ROLES constants in lib/auth/permissions.ts. Signed in but
   role "user" → redirect to "/" (they're authenticated, just not
   authorized — don't send them back to a sign-in page they already
   passed). Not signed in → keep existing behavior (redirect to /sign-in
   with redirectTo). Report whether reading the role needs an extra call
   or is already in the session payload for your better-auth version.

PART B — add the new dependencies

2. Add @tanstack/react-table, react-hook-form, @hookform/resolvers,
   sonner, and recharts to package.json (zod is already present). Add
   shadcn's sidebar primitive via the shadcn CLI
   (npx shadcn@latest add sidebar) if components/ui/sidebar.tsx doesn't
   already exist — confirm first, don't overwrite if it's already there
   in some form.

PART C — admin layout (RTL, theme-derived, own structure)

3. app/[locale]/admin/layout.tsx: fully separate from the public site's
   layout (no shared Navbar/Footer). Force dir="rtl" unconditionally
   regardless of the /fa or /en prefix, using the sidebar primitive's own
   direction support rather than a manual CSS override. Pull colors/
   typography from the existing CSS custom properties in app/globals.css.
4. components/admin/AdminSidebar.tsx: collapsible, with grouped nav
   sections (see Part E) — model the grouping/collapse interaction on
   shadcn-admin's nav-group.tsx pattern, adapted to a Next.js Link-based
   active-state check (usePathname) instead of TanStack Router's route
   matching.
5. components/admin/AdminTopbar.tsx: user menu (name/avatar + sign-out via
   authClient.signOut()). Skip the command-palette/search feature from
   the reference template for this pass — out of scope until there's
   real content to search.

PART D — the reusable DataTable foundation (for Step 7, built now)

6. Create components/admin/data-table/DataTable.tsx plus the supporting
   pieces (column-header with sort indicator, pagination controls, a
   toolbar slot for filters) using @tanstack/react-table, modeled on the
   reference template's components/data-table/* toolkit but trimmed to
   what's actually needed now — sorting, pagination, and a filter input
   slot are enough; skip bulk-actions/faceted-filter/view-options unless
   a Step 7 screen turns out to need them. This won't render anything on
   its own yet (no CRUD data exists to show) — it's scaffolding Step 7
   will consume directly, so keep its API generic (columns + data props),
   not tied to any one entity.

PART E — role-gated navigation

7. Sidebar groups, gated by the same role source as Part A:
   - Both admin + owner: Catalog group (Products, Categories, Designers,
     Collections, Materials, Flagships, Projects, Fabrics, Catalogue) —
     placeholder pages under app/[locale]/admin/<section>/page.tsx
     rendering "coming soon" for now.
   - Owner only: an Admins section/nav item (placeholder route — real
     admin-account management is a later step, but gate it now).

PART F — overview page

8. app/[locale]/admin/page.tsx: stat cards (using recharts or plain
   shadcn Card components — your call on whether a chart adds real value
   here yet, given there's no time-series data like orders to chart
   until commerce exists) showing live counts for products, designers,
   collections, materials, flagships, projects. Add a lightweight
   count() function per repository (e.g. getProductCount() via Prisma's
   count()) rather than fetching full lists.

PART G — i18n and toasts

9. All admin UI text through lib/i18n/translations/admin.ts (new file,
   registered in the index, fa + en both required), following the
   established pattern. Wire sonner's <Toaster /> into the admin layout
   for future CRUD feedback, even though nothing triggers a toast yet.

PART H — verification

10. Update tests/unit/proxy.test.ts for the new role-based redirect
    (authenticated-wrong-role → "/", unauthenticated → /sign-in,
    authenticated-admin-role → allowed through).
11. Run npx tsc --noEmit, pnpm run build, pnpm test (retry once on a
    Neon P1001 before reporting it as a real failure). Manually confirm:
    a "user"-role account hitting /admin bounces to "/"; an admin/owner
    account reaches the dashboard; the owner-only nav item is invisible
    to an admin-role account; the sidebar renders correctly RTL in both
    /fa/admin and /en/admin.

Report back: what proxy.ts's /admin check looked like before this change,
which approach you used to read the role in the proxy context, and
whether components/ui/sidebar.tsx already existed or was added fresh.


---------------------------------------------------------------------------------------------
Plan: admin dashboard shell
TL;DR: I’m handling the security fix first, then the dashboard shell and scaffolding around the project’s existing Next.js App Router, Better Auth, and i18n setup. The role gate in the proxy is the real issue to close before any admin UI is introduced.

Findings from the repo
The current proxy only checks whether a session exists for /admin and does not verify role.
The app already has the right role constants in permissions.ts, and the admin plugin is wired to them in auth.ts.
The Better Auth admin plugin in this version exposes the role on the session payload as session.user.role, so no extra call is needed once getSession succeeds.
components/ui/sidebar.tsx does not exist yet, so the shadcn sidebar primitive will be added fresh rather than overwriting anything.

Plan steps

1-Fix the admin security gate in proxy.ts

Keep the existing unauthenticated redirect to /sign-in?redirectTo=...
For any /admin path, after session detection, verify session.user.role is in ADMIN_ROLES from permissions.ts
If the user is signed in but not admin-level, redirect them to /
This is the real security fix and should be done first
Update tests and role assertions

2-Adjust proxy.test.ts to cover:
authenticated wrong-role → /
unauthenticated → /sign-in
authenticated admin/owner role → allowed
This creates the failing regression check before the implementation lands

3-Add dependencies and shadcn sidebar primitive

Add @tanstack/react-table, react-hook-form, @hookform/resolvers, sonner, and recharts to package.json
Confirm whether the sidebar primitive exists; it does not, so add it fresh with the shadcn CLI
Avoid overwriting any existing implementation if a future branch or local variation exists


4-Build the isolated admin shell

Create app/[locale]/admin/layout.tsx as its own layout, separate from the public app layout
Force RTL in the admin area via the sidebar primitive’s own direction support rather than manual CSS override
Keep colors and type styles pulled from the existing CSS variables in globals.css


5-Add the admin navigation and topbar

Create components/admin/AdminSidebar.tsx with collapsible grouped sections and App Router active-state logic using usePathname
Create components/admin/AdminTopbar.tsx with user name/avatar and signOut flow using authClient.signOut()
Wire sonner’s Toaster into the admin layout for future feedback


6-Create the generic DataTable foundation

Add the support files for components/admin/data-table/DataTable.tsx
Keep it generic to columns + data + filter slot, with sorting and pagination only
This is scaffolding for future screens; no CRUD-specific assumptions should be baked in


7-Add role-gated navigation and placeholder admin screens

Catalog group visible to admin + owner
Owner-only Admins nav item visible only to owner
Create placeholder pages under app/[locale]/admin/<section>/page.tsx showing “coming soon” until real CRUD screens exist


8-Add the overview dashboard

Create app/[locale]/admin/page.tsx
Show stat cards for products, designers, collections, materials, flagships, projects
Use lightweight count() fetches per repository or Prisma model rather than loading full lists


9-Add i18n strings and admin translations

Add lib/i18n/translations/admin.ts
Register it in index.ts
Use the translation dictionary for admin labels instead of hardcoded copy

10-Validate with the required commands

npx tsc --noEmit
pnpm run build
pnpm test
Retry once on a transient Neon P1001 before treating it as a real issue
Manually confirm the admin routes and sidebar render correctly in both /fa/admin and /en/admin


10-Validate with the required commands

npx tsc --noEmit
pnpm run build
pnpm test
Retry once on a transient Neon P1001 before treating it as a real issue
Manually confirm the admin routes and sidebar render correctly in both /fa/admin and /en/admin


Relevant files
proxy.ts
permissions.ts
auth.ts
package.json
app/[locale]/admin/layout.tsx
app/[locale]/admin/page.tsx
components/admin/AdminSidebar.tsx
components/admin/AdminTopbar.tsx
components/admin/data-table/DataTable.tsx
lib/i18n/translations/admin.ts
index.ts
proxy.test.ts



Verification
1-Proxy role checks pass for admin/owner, wrong-role, and unauthenticated cases
2-TypeScript compiles cleanly with npx tsc --noEmit
3-The production build completes with pnpm run build
4-Vitest passes with pnpm test, or one retry is used for an isolated Neon P1001
5-Manual dashboard checks confirm the expected behavior across /fa/admin and /en/admin


Reported discrepancy status
Before the change, proxy.ts only checked whether auth.api.getSession returned a session. It did not inspect the role at all.
The role read approach I’m planning is: session.user.role from the Better Auth session object returned by getSession; this matches the configured admin plugin setup in auth.ts and the role constants in permissions.ts. No extra role-fetch call is needed in this version.
components/ui/sidebar.tsx did not exist in the workspace, so it will be added fresh as part of the shadcn setup instead of being assumed or overwritten.