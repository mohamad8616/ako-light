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
import { buttonVariants } from "@/components/ui/button";
import { destroyCollectionAction } from "@/lib/admin/actions/collections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LocaleLink from "@/lib/i18n/Link";
import type { CollectionAdminRow } from "@/lib/repositories/collections";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export function CollectionTable({ rows }: { rows: CollectionAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();

  const destroy = (id: string) =>
    run(() => destroyCollectionAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns: ColumnDef<CollectionAdminRow, unknown>[] = [
    localizedColumn({
      lang,
      label: t("admin.nav.collections"),
      access: (row: CollectionAdminRow) => row.name,
    }),
    textColumn({
      id: "year",
      label: t("admin.collection.field.year"),
      access: (row: CollectionAdminRow) => row.year,
    }),
    imageColumn({
      id: "image",
      label: t("admin.designer.field.image"),
      access: (row: CollectionAdminRow) => row.image,
    }),
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: CollectionAdminRow) => row.slug,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: CollectionAdminRow) => row.sortOrder,
    }),
    actionsColumn((row: CollectionAdminRow) => (
      <RowActions
        editHref={`/admin/collections/${row.id}`}
        onDestroy={() => destroy(row.id)}
      />
    )),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}

      toolbar={
        <LocaleLink
          href="/admin/collections/new"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          + {t("admin.crud.new")}
        </LocaleLink>
      }
    />
  );
}
