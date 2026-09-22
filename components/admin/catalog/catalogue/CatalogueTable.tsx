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
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createCatalogueAction,
  destroyCatalogueAction,
  updateCatalogueAction,
} from "@/lib/admin/actions/catalogue";
import {
  catalogueFormSchema,
  type CatalogueFormValues,
} from "@/lib/admin/schemas/catalogue";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LocaleLink from "@/lib/i18n/Link";
import type { CatalogueItemAdminRow } from "@/lib/repositories/catalogue";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";

/**
 * The catalogue list screen.
 *
 * CatalogueItem has NO slug column — `id` IS the route handle — so the form's id
 * field is user-supplied. `href` may be a real URL or "#" (several seeded cards
 * are placeholders), and `coverTextColor` is nullable: a switch flips it
 * between NULL and a colour so the schema never sees an impossible "".
 */
export function CatalogueTable({ rows }: { rows: CatalogueItemAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) =>
    run(() => destroyCatalogueAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns = [
    textColumn({
      id: "title",
      label: t("admin.catalogue.field.title"),
      access: (row: CatalogueItemAdminRow) => row.title,
    }),
    textColumn({
      id: "href",
      label: t("admin.catalogue.field.href"),
      access: (row: CatalogueItemAdminRow) => row.href,
      className: "font-mono text-xs",
    }),
    {
      id: "coverColor",
      enableSorting: false,
      header: () => <span>{t("admin.catalogue.field.coverColor")}</span>,
      cell: (ctx: { row: { original: CatalogueItemAdminRow } }) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="border-border size-4 rounded-full border"
            style={{ background: ctx.row.original.coverColor }}
          />
          <span dir="ltr" className="text-muted-foreground font-mono text-xs">
            {ctx.row.original.coverColor}
          </span>
        </span>
      ),
    },
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: CatalogueItemAdminRow) => row.id,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: CatalogueItemAdminRow) => row.sortOrder,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: CatalogueItemAdminRow } }) => (
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
            href="/admin/catalogue/new"
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
        <CatalogueDialog
          open
          onClose={() => setIsCreating(false)}
          onSave={async (values) => {
            const result = await run(() => createCatalogueAction(values), {
              successMessage: t("admin.crud.created"),
            });
            return result?.ok ?? false;
          }}
        />
      )}

      {editingId && (
        <CatalogueDialog
          open
          initialData={rows.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={async (values) => {
            const result = await run(
              () => updateCatalogueAction(editingId, values),
              { successMessage: t("admin.table.saved") },
            );
            return result?.ok ?? false;
          }}
        />
      )}
    </div>
  );
}

function CatalogueDialog({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: CatalogueFormValues) => Promise<boolean>;
  initialData?: CatalogueItemAdminRow;
}) {
  const { t } = useLanguage();
  const form = useForm<CatalogueFormValues>({
    resolver: zodResolver(catalogueFormSchema),
    values: initialData
      ? {
          id: initialData.id,
          title: initialData.title,
          href: initialData.href,
          coverColor: initialData.coverColor,
          coverTextColor: initialData.coverTextColor ?? null,
          sortOrder: initialData.sortOrder,
        }
      : {
          id: "",
          title: "",
          href: "#",
          coverColor: "#171719",
          coverTextColor: null,
          sortOrder: 0,
        },
  });

  const coverTextColor = useWatch({
    control: form.control,
    name: "coverTextColor",
  });
  const hasCoverTextColor = coverTextColor != null;

  return (
    <DialogFormShell
      open={open}
      onClose={onClose}
      title={initialData ? t("admin.product.edit") : t("admin.product.new")}
      form={form}
      onSave={onSave}
    >
      <TextField
        name="title"
        label={t("admin.catalogue.field.title")}
        required
        dir="ltr"
      />
      <SlugField
        name="id"
        label={t("admin.product.field.slug")}
        source="title"
        required
      />
      <TextField
        name="href"
        label={t("admin.catalogue.field.href")}
        required
        placeholder="https://... or #"
        mono
      />
      <ColorField
        name="coverColor"
        label={t("admin.catalogue.field.coverColor")}
      />
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground text-xs font-medium">
            {t("admin.catalogue.field.coverTextColor")}
          </span>
          <Switch
            checked={hasCoverTextColor}
            onCheckedChange={(checked) =>
              form.setValue("coverTextColor", checked ? "#FFFFFF" : null, {
                shouldValidate: false,
              })
            }
          />
        </div>
        {hasCoverTextColor ? (
          <ColorField
            name="coverTextColor"
            label={t("admin.catalogue.field.coverTextColor")}
          />
        ) : null}
      </div>
      <NumberField
        name="sortOrder"
        label={t("admin.product.field.sortOrder")}
        min={0}
      />
    </DialogFormShell>
  );
}
