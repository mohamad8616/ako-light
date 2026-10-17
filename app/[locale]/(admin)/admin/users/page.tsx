import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { getAdminIdentity, requireAdminAccess } from "@/lib/admin/access";
import { defaultLocale, isLocale } from "@/lib/i18n/routing";
import { getUserDirectoryPage } from "@/lib/repositories/user-directory";

/**
 * The SHARED user directory — `/admin/users`.
 *
 * Both `admin` and `owner` land here (the opposite of the owner-only
 * `/admin/admins`). The gate is `requireAdminAccess()`, which admits only
 * admin-level roles; a plain customer is bounced by proxy.ts at the edge and,
 * failing that, by this call in the React tree.
 *
 * The page reads the caller's identity so the table can render the CORRECT
 * scope — an admin sees ban controls only, an owner also sees the role control.
 * That is presentation, not authorization: every mutation re-checks the caller's
 * authority in the server action (lib/admin/actions/user-directory.ts), so a
 * forged request from an admin is refused regardless of what the UI showed.
 *
 * Every role is listed — customers, admins and owners (see
 * lib/repositories/user-directory). Row ACTIONS are still decided server-side by
 * the rank rules, so seeing an owner here does not mean being able to change it.
 *
 * ── Search & pagination (server-side) ────────────────────────────────────────
 *
 * `?q=` drives the query, so the ROW SET is filtered in Postgres; the whole
 * user table never reaches the browser. This page renders PAGE 1 only
 * (`USER_DIRECTORY_PAGE_SIZE` = 20 rows); the table's infinite scroll fetches
 * the following pages through `loadMoreUserDirectoryPage`, so there is no
 * `?page=` any more.
 */
export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : defaultLocale;
  await requireAdminAccess(activeLocale);

  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : undefined;

  const [directory, identity] = await Promise.all([
    getUserDirectoryPage({ search, page: 1 }),
    getAdminIdentity(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={activeLocale}
          titleKey="admin.nav.users"
          descriptionKey="admin.section.users.description"
        />
        <UsersTable
          // A new query is a NEW table: remounting resets the pages the
          // infinite scroll had accumulated for the previous search.
          key={search ?? ""}
          rows={directory.rows}
          total={directory.total}
          search={search ?? ""}
          currentUserId={identity?.id}
          currentRole={identity?.role}
        />
      </div>
    </div>
  );
}
