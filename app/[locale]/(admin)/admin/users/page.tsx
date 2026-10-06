import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { getAdminIdentity, requireAdminAccess } from "@/lib/admin/access";
import { defaultLocale, isLocale } from "@/lib/i18n/routing";
import { getUserDirectoryPage } from "@/lib/repositories/user-directory";
import { notFound } from "next/navigation";

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
 * Only customers (role `user`) are listed — see lib/repositories/user-directory.
 *
 * ── Search & pagination (server-side) ────────────────────────────────────────
 *
 * `searchParams` drive the query, so the ROW SET is filtered and paged in
 * Postgres; the whole user table never reaches the browser. `?q=` narrows by
 * name/email and `?page=` selects a page of `USER_DIRECTORY_PAGE_SIZE`.
 */
export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : defaultLocale;
  await requireAdminAccess(activeLocale);

  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : undefined;
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);

  const [directory, identity] = await Promise.all([
    getUserDirectoryPage({
      search,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
    getAdminIdentity(),
  ]);

  // A page number beyond the last one is a dead URL, not an empty table — the
  // same "unknown id 404s" convention the product edit page uses. Page 1 is
  // always valid (an empty directory renders the empty state instead).
  if (directory.page > 1 && directory.rows.length === 0) notFound();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={activeLocale}
          titleKey="admin.nav.users"
          descriptionKey="admin.section.users.description"
        />
        <UsersTable
          rows={directory.rows}
          total={directory.total}
          page={directory.page}
          pageSize={directory.pageSize}
          search={search ?? ""}
          currentUserId={identity?.id}
          currentRole={identity?.role}
        />
      </div>
    </div>
  );
}
