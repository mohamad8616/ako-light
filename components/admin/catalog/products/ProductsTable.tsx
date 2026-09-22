"use client";

import {
  actionsColumn,
  localizedColumn,
  numberColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { destroyProductAction } from "@/lib/admin/actions/products";
import LocaleLink from "@/lib/i18n/Link";
import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ProductAdminRow } from "@/lib/repositories/products";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

/**
 * The products list screen — the section's whole table. Columns follow the
 * dashboard request: name (active locale first, the other as a muted secondary
 * line), category, designer, price, stock badge + quantity, display order and
 * the edit/delete actions. Delete warnings appear only for products that
 * actually have images/project links to lose.
 */
export function ProductsTable({ rows }: { rows: ProductAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();

  const destroy = (id: string) =>
    run(() => destroyProductAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns: ColumnDef<ProductAdminRow, unknown>[] = [
    localizedColumn({
      lang,
      label: t("admin.nav.products"),
      access: (row) => row.name,
    }),
    textColumn({
      id: "category",
      label: t("admin.table.col.category"),
      access: (row) => pick(row.categoryName, lang),
    }),
    textColumn({
      id: "designer",
      label: t("admin.table.col.designer"),
      access: (row) => (row.designerName ? pick(row.designerName, lang) : null),
    }),
    numberColumn({
      id: "price",
      label: t("admin.product.field.price"),
      lang,
      access: (row) => row.price,
    }),
    {
      id: "stock",
      accessorFn: (row) => (row.existsInStore ? 1 : 0),
      header: () => <span>{t("admin.product.field.stock")}</span>,
      sortingFn: "basic",
      cell: (ctx) => {
        const row = ctx.row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={row.existsInStore ? "default" : "destructive"}>
              {row.existsInStore
                ? t("admin.product.stock.in")
                : t("admin.product.stock.out")}
            </Badge>
            <span className="text-muted-foreground text-xs tabular-nums">
              ×{row.quantity}
            </span>
          </div>
        );
      },
    },
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row) => row.sortOrder,
    }),
    actionsColumn((row) => (
      <RowActions
        editHref={`/admin/products/${row.id}`}
        onDestroy={() => destroy(row.id)}
        deleteWarning={
          row.imageCount > 0 || row.quantity > 0
            ? t("admin.product.deleteWarning")
            : undefined
        }
      />
    )),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
 
      toolbar={
        <LocaleLink
          href="/admin/products/new"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          + {t("admin.crud.new")}
        </LocaleLink>
      }
    />
  );
}
