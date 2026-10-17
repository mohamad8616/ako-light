"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { localizedColumn, numberColumn, slugColumn, textColumn } from "@/components/admin/catalog/columns";
import { DialogFormShell } from "@/components/admin/catalog/fields/DialogFormShell";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import { NumberField } from "@/components/admin/catalog/fields/ScalarFields";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { buttonVariants } from "@/components/ui/button";
import { createMaterialItemAction, destroyMaterialItemAction, updateMaterialItemAction } from "@/lib/admin/actions/material-items";
import { materialItemFormSchema, type MaterialItemFormValues } from "@/lib/admin/schemas/material-item";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MaterialCategoryAdminRow } from "@/lib/repositories/material-categories";
import type { MaterialItemAdminRow } from "@/lib/repositories/material-items";
import { cn } from "@/lib/utils";

export function MaterialItemsTable({
  rows,
  categories,
}: {
  rows: MaterialItemAdminRow[];
  categories: MaterialCategoryAdminRow[];
}) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const options = categories.map((category) => ({
    value: category.id,
    label: category.name[lang].trim() || category.name.en,
  }));

  const destroy = (id: string) => run(() => destroyMaterialItemAction(id), { successMessage: t("admin.crud.deleted") });
  const columns = [
    localizedColumn({ lang, label: t("admin.product.field.name"), access: (row: MaterialItemAdminRow) => row.name }),
    localizedColumn({ id: "category", lang, label: t("admin.material.field.category"), access: (row: MaterialItemAdminRow) => row.categoryName }),
    slugColumn({ label: t("admin.product.field.slug"), access: (row: MaterialItemAdminRow) => row.slug }),
    textColumn({ id: "status", label: t("admin.material.field.readiness"), access: (row: MaterialItemAdminRow) => row.isReady ? t("admin.material.ready") : t("admin.material.incomplete") }),
    numberColumn({ id: "sortOrder", label: t("admin.product.field.sortOrder"), lang, access: (row: MaterialItemAdminRow) => row.sortOrder }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: MaterialItemAdminRow } }) => (
        <RowActions editHref="" onEdit={() => setEditingId(ctx.row.original.id)} onDestroy={() => destroy(ctx.row.original.id)} />
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
            href="/admin/material-items/new"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            onClick={(event) => { event.preventDefault(); setIsCreating(true); }}
          >
            + {t("admin.crud.new")}
          </LocaleLink>
        }
      />
      {isCreating ? (
        <MaterialItemDialog
          open
          categories={options}
          onClose={() => setIsCreating(false)}
          onSave={async (values) => {
            const result = await run(() => createMaterialItemAction(values), { successMessage: t("admin.crud.created") });
            return result?.ok ?? false;
          }}
        />
      ) : null}
      {editingId ? (
        <MaterialItemDialog
          open
          categories={options}
          initialData={rows.find((row) => row.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={async (values) => {
            const result = await run(() => updateMaterialItemAction(editingId, values), { successMessage: t("admin.table.saved") });
            return result?.ok ?? false;
          }}
        />
      ) : null}
    </div>
  );
}

function MaterialItemDialog({
  open,
  onClose,
  onSave,
  initialData,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: MaterialItemFormValues) => Promise<boolean>;
  initialData?: MaterialItemAdminRow;
  categories: { value: string; label: string }[];
}) {
  const { t } = useLanguage();
  const seed = React.useMemo(() => ({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? { en: "", fa: "" },
    categoryId: initialData?.categoryId ?? categories[0]?.value ?? "",
    image: initialData?.image ?? "",
    sortOrder: initialData?.sortOrder ?? 0,
  }), [initialData, categories]);
  const form = useForm<MaterialItemFormValues>({ resolver: zodResolver(materialItemFormSchema), values: seed });

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
      <SelectField
        name="categoryId"
        label={t("admin.material.field.category")}
        required
        options={categories}
        placeholder={t("admin.material.field.category")}
      />
      <ImageUpload name="image" label={t("admin.designer.field.image")} required folder="materials/items" />
      <NumberField name="sortOrder" label={t("admin.product.field.sortOrder")} min={0} />
    </DialogFormShell>
  );
}
