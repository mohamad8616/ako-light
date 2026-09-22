"use client";

import {
  localizedColumn,
  numberColumn,
  slugColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import { DialogFormShell } from "@/components/admin/catalog/fields/DialogFormShell";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { buttonVariants } from "@/components/ui/button";
import {
  createMaterialAction,
  destroyMaterialAction,
  updateMaterialAction,
} from "@/lib/admin/actions/materials";
import {
  MATERIAL_TYPE_VALUES,
  materialFormSchema,
  type MaterialFormValues,
} from "@/lib/admin/schemas/material";
import type { MaterialAdminRow } from "@/lib/repositories/materials";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";

/**
 * The materials list screen. The `type` picker uses the app-level union values
 * as labels — they are stored enum values ("stone-composite" ↔ the Prisma member
 * `stone_composite`), not user-facing copy, and the repository maps them.
 */
export function MaterialsTable({ rows }: { rows: MaterialAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) =>
    run(() => destroyMaterialAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const typeOptions = MATERIAL_TYPE_VALUES.map((value) => ({
    value,
    label: value,
  }));

  const columns = [
    localizedColumn({
      lang,
      label: t("admin.nav.materials"),
      access: (row: MaterialAdminRow) => row.name,
    }),
    textColumn({
      id: "category",
      label: t("admin.material.field.category"),
      access: (row: MaterialAdminRow) => row.category,
    }),
    textColumn({
      id: "type",
      label: t("admin.material.field.type"),
      access: (row: MaterialAdminRow) => row.type,
    }),
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: MaterialAdminRow) => row.slug,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: MaterialAdminRow) => row.sortOrder,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: MaterialAdminRow } }) => (
        <RowActions
          editHref=""
          onEdit={() => setEditingId(ctx.row.original.id)}
          onDestroy={() => destroy(ctx.row.original.id)}
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
            onClick={(e) => {
              e.preventDefault();
              setIsCreating(true);
            }}
          >
            + {t("admin.crud.new")}
          </LocaleLink>
        }
      />

      {isCreating && (
        <MaterialDialog
          open
          onClose={() => setIsCreating(false)}
          onSave={async (values) => {
            const result = await run(() => createMaterialAction(values), {
              successMessage: t("admin.crud.created"),
            });
            return result?.ok ?? false;
          }}
          typeOptions={typeOptions}
        />
      )}

      {editingId && (
        <MaterialDialog
          open
          initialData={rows.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={async (values) => {
            const result = await run(
              () => updateMaterialAction(editingId, values),
              { successMessage: t("admin.table.saved") },
            );
            return result?.ok ?? false;
          }}
          typeOptions={typeOptions}
        />
      )}
    </div>
  );
}

function MaterialDialog({
  open,
  onClose,
  onSave,
  initialData,
  typeOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: MaterialFormValues) => Promise<boolean>;
  initialData?: MaterialAdminRow;
  typeOptions: { value: string; label: string }[];
}) {
  const { t } = useLanguage();
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    values: initialData
      ? {
          slug: initialData.slug,
          name: initialData.name,
          category: initialData.category,
          type: initialData.type,
          image: initialData.image,
          description: initialData.description,
          sortOrder: initialData.sortOrder,
        }
      : {
          slug: "",
          name: { en: "", fa: "" },
          category: "",
          type: "stone",
          image: "",
          description: { en: "", fa: "" },
          sortOrder: 0,
        },
  });

  return (
    <DialogFormShell
      open={open}
      onClose={onClose}
      title={initialData ? t("admin.product.edit") : t("admin.product.new")}
      form={form}
      onSave={onSave}
      wide
    >
      <LocalizedField
        name="name"
        label={t("admin.product.field.name")}
        required
      />
      <SlugField
        name="slug"
        label={t("admin.product.field.slug")}
        source="name.en"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="category"
          label={t("admin.material.field.category")}
          required
          dir="ltr"
          placeholder="Stone"
        />
        <SelectField
          name="type"
          label={t("admin.material.field.type")}
          required
          options={typeOptions}
        />
      </div>
      <TextField
        name="image"
        label={t("admin.designer.field.image")}
        required
        placeholder="https://..."
        mono
      />
      <LocalizedField
        name="description"
        label={t("admin.material.field.description")}
        required
        textarea
        rows={3}
      />
      <NumberField
        name="sortOrder"
        label={t("admin.product.field.sortOrder")}
        min={0}
      />
    </DialogFormShell>
  );
}