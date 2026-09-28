"use client";

import {
  actionsColumn,
  numberColumn,
  updatedColumn,
} from "@/components/admin/catalog/columns";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderAdminRow } from "@/lib/repositories/orders";
import type { ColumnDef } from "@tanstack/react-table";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LocaleLink from "@/lib/i18n/Link";

/**
 * The orders list screen — mirrors the pattern of ProductsTable.
 * Columns: customer (name + email), total (Toman), payment status (read-only badge),
 * fulfillment status (badge), date, actions (view detail only, fulfillment edited on detail page).
 */
export function OrdersTable({ rows }: { rows: OrderAdminRow[] }) {
  const { t, lang } = useLanguage();

  const columns: ColumnDef<OrderAdminRow, unknown>[] = [
    {
      id: "customer",
      header: () => <span>{t("admin.order.col.customer")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        return (
          <div className="max-w-56 min-w-24">
            <span className="text-foreground block truncate font-medium">
              {row.userName}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {row.userEmail}
            </span>
          </div>
        );
      },
    },
    numberColumn({
      id: "totalAmount",
      label: t("admin.order.col.total"),
      lang,
      access: (row) => row.totalAmount,
    }),
    {
      id: "status",
      header: () => <span>{t("admin.order.col.paymentStatus")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          pending: { label: t("admin.order.status.pending"), variant: "outline" },
          paid: { label: t("admin.order.status.paid"), variant: "default" },
          failed: { label: t("admin.order.status.failed"), variant: "destructive" },
          cancelled: { label: t("admin.order.status.cancelled"), variant: "secondary" },
        };
        const config = statusConfig[row.status] ?? { label: row.status, variant: "outline" };
        return (
          <Badge variant={config.variant} className="gap-1">
            <span className="text-xs">{config.label}</span>
            <span className="text-[10px] text-muted-foreground opacity-60">(read-only)</span>
          </Badge>
        );
      },
    },
    {
      id: "fulfillmentStatus",
      header: () => <span>{t("admin.order.col.fulfillmentStatus")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          unfulfilled: { label: t("admin.order.fulfillment.unfulfilled"), variant: "outline" },
          shipped: { label: t("admin.order.fulfillment.shipped"), variant: "default" },
          delivered: { label: t("admin.order.fulfillment.delivered"), variant: "default" },
          cancelled: { label: t("admin.order.fulfillment.cancelled"), variant: "secondary" },
        };
        const config = statusConfig[row.fulfillmentStatus] ?? { label: row.fulfillmentStatus, variant: "outline" };
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      },
    },
    updatedColumn({
      label: t("admin.order.col.date"),
      lang,
      access: (row) => row.createdAt,
    }),
    actionsColumn((row) => (
      <LocaleLink
        href={`/admin/orders/${row.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {t("admin.crud.view")}
      </LocaleLink>
    )),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
    />
  );
}