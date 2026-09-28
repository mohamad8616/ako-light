import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrdersTable } from "@/components/admin/catalog/orders/OrdersTable";
import { getOrderAdminRows } from "@/lib/repositories/orders";

/**
 * The orders list — the dashboard's DataTable wired into real use for the
 * first time: the section's rows with its own columns (customer, total in Toman,
 * payment status (read-only), fulfillment status, date), sorting and pagination.
 *
 * Server component on purpose: the rows are read here once per request and
 * passed down to the client table (the DTOs are plain and serializable —
 * Decimal/Date never cross the boundary).
 */
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const rows = await getOrderAdminRows();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.orders"
          descriptionKey="admin.section.orders.description"
        />
        <OrdersTable rows={rows} />
      </div>
    </div>
  );
}