"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DialogFormShell } from "@/components/admin/catalog/fields/DialogFormShell";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import { NumberField } from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { buttonVariants } from "@/components/ui/button";
import {
  createMaterialCategoryAction,
  destroyMaterialCategoryAction,
  updateMaterialCategoryAction,
} from "@/lib/admin/actions/material-categories";
import { materialCategoryFormSchema, type MaterialCategoryFormValues } from "@/lib/admin/schemas/material-category";
import { localizedColumn, numberColumn, slugColumn } from "@/components/admin/catalog/columns";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MaterialCategoryAdminRow } from "@/lib/repositories/material-categories";
import { cn } from "@/lib/utils";

export function MaterialCategoriesTable({ rows }: { rows: MaterialCategoryAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) => run(() => destroyMaterialCategoryAction(id), {
    successMessage: t("admin.crud.deleted"),
  });

  const columns = [
    localizedColumn({ lang, label: t("admin.nav.materials"), access: (row: MaterialCategoryAdminRow) => row.name }),
    slugColumn({ label: t("admin.product.field.slug"), access: (row: MaterialCategoryAdminRow) => row.slug }),
    numberColumn({ id: "itemCount", label: t("admin.material.field.itemCount"), lang, access: (row: MaterialCategoryAdminRow) => row.itemCount }),
    numberColumn({ id: "sortOrder", label: t("admin.product.field.sortOrder"), lang, access: (row: MaterialCategoryAdminRow) => row.sortOrder }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: MaterialCategoryAdminRow } }) => (
        <RowActions
          editHref=""
          onEdit={() => setEditingId(ctx.row.original.id)}
          onDestroy={() => destroy(ctx.row.original.id)}
          deleteWarning={ctx.row.original.itemCount > 0 ? t("admin.material.categoryInUse") : undefined}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={rows}
        toolbar={
          <LocaleLink
            href="/admin/materials/new"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            onClick={(event) => { event.preventDefault(); setIsCreating(true); }}
          >
            + {t("admin.crud.new")}
          </LocaleLink>
        }
      />
      {isCreating ? (
        <CategoryDialog
          open
          onClose={() => setIsCreating(false)}
          onSave={async (values) => {
            const result = await run(() => createMaterialCategoryAction(values), { successMessage: t("admin.crud.created") });
            return result?.ok ?? false;
          }}
        />
      ) : null}
      {editingId ? (
        <CategoryDialog
          open
          initialData={rows.find((row) => row.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={async (values) => {
            const result = await run(() => updateMaterialCategoryAction(editingId, values), { successMessage: t("admin.table.saved") });
            return result?.ok ?? false;
          }}
        />
      ) : null}
    </div>
  );
}

function CategoryDialog({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: MaterialCategoryFormValues) => Promise<boolean>;
  initialData?: MaterialCategoryAdminRow;
}) {
  const { t } = useLanguage();
  const seed = React.useMemo(() => ({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? { en: "", fa: "" },
    image: initialData?.image ?? "",
    sortOrder: initialData?.sortOrder ?? 0,
  }), [initialData]);
  const form = useForm<MaterialCategoryFormValues>({ resolver: zodResolver(materialCategoryFormSchema), values: seed });

  return (
    <DialogFormShell
      open={open}
      onClose={onClose}
      title={initialData ? t("admin.product.edit") : t("admin.product.new")}
      form={form}
      onSave={onSave}
      wide
    >
      <LocalizedField name="name" label={t("admin.product.field.name")} required />
      <SlugField name="slug" label={t("admin.product.field.slug")} source="name.en" required />
      <ImageUpload name="image" label={t("admin.designer.field.image")} required folder="materials/categories" />
      <NumberField name="sortOrder" label={t("admin.product.field.sortOrder")} min={0} />
    </DialogFormShell>
  );
}
