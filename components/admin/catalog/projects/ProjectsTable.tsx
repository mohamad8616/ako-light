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
import { destroyProjectAction } from "@/lib/admin/actions/projects";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ProjectAdminRow } from "@/lib/repositories/projects";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

/**
 * The projects list screen — the section's whole table: name, location, year,
 * image, the join-table product count (what the form's ProductsUsedField
 * writes), slug and display order, plus the edit/delete actions. Delete warns
 * that the project's product links go with it.
 */
export function ProjectsTable({ rows }: { rows: ProjectAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();

  const destroy = (id: string) =>
    run(() => destroyProjectAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns: ColumnDef<ProjectAdminRow, unknown>[] = [
    localizedColumn({
      lang,
      label: t("admin.nav.projects"),
      access: (row) => row.name,
    }),
    textColumn({
      id: "location",
      label: t("admin.project.field.location"),
      access: (row) => row.location,
    }),
    textColumn({
      id: "year",
      label: t("admin.collection.field.year"),
      access: (row) => row.year,
    }),
    imageColumn({
      id: "image",
      label: t("admin.designer.field.image"),
      access: (row) => row.image,
    }),
    numberColumn({
      id: "productCount",
      label: t("admin.designer.field.products"),
      lang,
      access: (row) => row.productCount,
    }),
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
        editHref={`/admin/projects/${row.id}`}
        onDestroy={() => destroy(row.id)}
        deleteWarning={
          row.productCount > 0 ? t("admin.project.deleteWarning") : undefined
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
          href="/admin/projects/new"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          + {t("admin.crud.new")}
        </LocaleLink>
      }
    />
  );
}
