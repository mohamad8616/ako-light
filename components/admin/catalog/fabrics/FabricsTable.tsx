"use client";

import {
  numberColumn,
  slugColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import { DialogFormShell } from "@/components/admin/catalog/fields/DialogFormShell";
import {
  ColorField,
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { buttonVariants } from "@/components/ui/button";
import {
  createFabricAction,
  destroyFabricAction,
  updateFabricAction,
} from "@/lib/admin/actions/fabrics";
import {
  fabricFormSchema,
  type FabricFormValues,
} from "@/lib/admin/schemas/fabric";
import type { FabricItemAdminRow } from "@/lib/repositories/fabrics";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";

/**
 * The fabrics list screen.
 *
 * FabricItem has NO slug column — `id` IS the route handle — so the form's id
 * field is user-supplied and gets the same rename warning treatment as a slug
 * (there is no SlugHistory coverage for fabrics).
 */
export function FabricsTable({ rows }: { rows: FabricItemAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) =>
    run(() => destroyFabricAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns = [
    textColumn({
      id: "name",
      label: t("admin.product.field.name"),
      access: (row: FabricItemAdminRow) => row.name,
    }),
    textColumn({
      id: "code",
      label: t("admin.fabric.field.code"),
      access: (row: FabricItemAdminRow) => row.code,
    }),
    textColumn({
      id: "category",
      label: t("admin.fabric.field.category"),
      access: (row: FabricItemAdminRow) => row.category,
    }),
    {
      id: "swatchColor",
      enableSorting: false,
      header: () => <span>{t("admin.fabric.field.swatchColor")}</span>,
      cell: (ctx: { row: { original: FabricItemAdminRow } }) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="border-border size-4 rounded-full border"
            style={{ background: ctx.row.original.swatchColor }}
          />
          <span dir="ltr" className="text-muted-foreground font-mono text-xs">
            {ctx.row.original.swatchColor}
          </span>
        </span>
      ),
    },
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: FabricItemAdminRow) => row.id,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: FabricItemAdminRow) => row.sortOrder,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: FabricItemAdminRow } }) => (
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
            href="/admin/fabrics/new"
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
        <FabricDialog
          open
          onClose={() => setIsCreating(false)}
          onSave={async (values) => {
            const result = await run(() => createFabricAction(values), {
              successMessage: t("admin.crud.created"),
            });
            return result?.ok ?? false;
          }}
        />
      )}

      {editingId && (
        <FabricDialog
          open
          initialData={rows.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={async (values) => {
            const result = await run(() => updateFabricAction(editingId, values), {
              successMessage: t("admin.table.saved"),
            });
            return result?.ok ?? false;
          }}
        />
      )}
    </div>
  );
}

function FabricDialog({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: FabricFormValues) => Promise<boolean>;
  initialData?: FabricItemAdminRow;
}) {
  const { t } = useLanguage();
  const form = useForm<FabricFormValues>({
    resolver: zodResolver(fabricFormSchema),
    values: initialData
      ? {
          id: initialData.id,
          name: initialData.name,
          code: initialData.code,
          category: initialData.category,
          swatchColor: initialData.swatchColor,
          sortOrder: initialData.sortOrder,
        }
      : {
          id: "",
          name: "",
          code: "",
          category: "",
          swatchColor: "#726A50",
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
      <TextField
        name="name"
        label={t("admin.product.field.name")}
        required
        dir="ltr"
      />
      <SlugField
        name="id"
        label={t("admin.product.field.slug")}
        source="name"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="code"
          label={t("admin.fabric.field.code")}
          required
          dir="ltr"
        />
        <TextField
          name="category"
          label={t("admin.fabric.field.category")}
          required
          dir="ltr"
        />
      </div>
      <ColorField
        name="swatchColor"
        label={t("admin.fabric.field.swatchColor")}
      />
      <NumberField
        name="sortOrder"
        label={t("admin.product.field.sortOrder")}
        min={0}
      />
    </DialogFormShell>
  );
}