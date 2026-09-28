import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminsTable } from "@/components/admin/catalog/admins/AdminsTable";
import { getAdminIdentity, requireOwnerAccess } from "@/lib/admin/access";
import { getAdminUserRows } from "@/lib/repositories/admin-users";

/**
 * The owner-only user-management screen.
 *
 * Access has two layers, exactly like every other admin route:
 *   - `proxy.ts` blocks a non-admin-level visitor at the edge (and the (admin)
 *     layout's `requireAdminAccess()` is the React-tree backstop);
 *   - this page THEN calls `requireOwnerAccess()` — an `admin` passes the shell
 *     gate but must be bounced to `/admin` here, because only an owner may
 *     manage roles.
 *
 * The gate is real server-side authorization, not just a hidden nav item: the
 * sidebar hides the link from non-owners, but a direct navigation still lands
 * on this function, which redirects.
 *
 * Server component on purpose: the rows are read once per request and passed
 * down to the client table (the DTO is plain and serializable).
 */
export default async function AdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOwnerAccess();

  const [rows, identity] = await Promise.all([
    getAdminUserRows(),
    getAdminIdentity(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.admins"
          descriptionKey="admin.section.admins.description"
        />
        <AdminsTable rows={rows} currentUserId={identity?.id} />
      </div>
    </div>
  );
}
