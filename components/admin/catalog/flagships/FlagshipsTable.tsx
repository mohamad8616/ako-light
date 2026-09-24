"use client";

import {
  actionsColumn,
  imageColumn,
  localizedColumn,
  numberColumn,
  slugColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { destroyFlagshipAction } from "@/lib/admin/actions/flagships";
import LocaleLink from "@/lib/i18n/Link";
import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { FlagshipAdminRow } from "@/lib/repositories/flagships";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

/**
 * The flagships list screen — same table kit as Products/Collections: name
 * (active locale first, the other muted), city, image, whether the row has a
 * published detail block, slug, display order and the edit/delete actions.
 * The delete warning only appears for rows that actually have detail content
 * to lose.
 */
export function FlagshipsTable({ rows }: { rows: FlagshipAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();

  const destroy = (id: string) =>
    run(() => destroyFlagshipAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns: ColumnDef<FlagshipAdminRow, unknown>[] = [
    localizedColumn({
      lang,
      label: t("admin.nav.flagships"),
      access: (row) => row.name,
    }),
    textColumn({
      id: "city",
      label: t("admin.flagship.field.city"),
      access: (row) => pick(row.city, lang),
    }),
    imageColumn({
      id: "image",
      label: t("admin.designer.field.image"),
      access: (row) => row.image,
    }),
    {
      id: "detail",
      accessorFn: (row) => (row.hasDetail ? 1 : 0),
      header: () => <span>{t("admin.flagship.field.hasDetail")}</span>,
      sortingFn: "basic",
      cell: (ctx) => (
        <Badge variant={ctx.row.original.hasDetail ? "default" : "outline"}>
          {ctx.row.original.hasDetail
            ? t("admin.flagship.detail.present")
            : t("admin.flagship.detail.absent")}
        </Badge>
      ),
    },
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row) => row.slug,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row) => row.sortOrder,
    }),
    actionsColumn((row) => (
      <RowActions
        editHref={`/admin/flagships/${row.id}`}
        onDestroy={() => destroy(row.id)}
        deleteWarning={
          row.hasDetail ? t("admin.flagship.deleteWarning") : undefined
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
          href="/admin/flagships/new"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          + {t("admin.crud.new")}
        </LocaleLink>
      }
    />
  );
}
