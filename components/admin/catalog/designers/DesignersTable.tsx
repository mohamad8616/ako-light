"use client";

import {
  localizedColumn,
  numberColumn,
  slugColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { RowActions } from "@/components/admin/catalog/RowActions";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDesignerAction,
  destroyDesignerAction,
  updateDesignerAction,
} from "@/lib/admin/actions/designers";
import { designerFormSchema } from "@/lib/admin/schemas/designer";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LocaleLink from "@/lib/i18n/Link";
import type { DesignerAdminRow } from "@/lib/repositories/designers";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";

/**
 * The designers list screen — same DataTable pattern as categories, create/edit
 * in a dialog. Includes the designer's image and website fields, plus the
 * localized bio list.
 */
export function DesignersTable({ rows }: { rows: DesignerAdminRow[] }) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) =>
    run(() => destroyDesignerAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns = [
    localizedColumn({
      lang,
      label: t("admin.nav.designers"),
      access: (row: DesignerAdminRow) => row.name,
    }),
    textColumn({
      id: "image",
      label: t("admin.designer.field.image"),
      access: (row: DesignerAdminRow) => row.image,
    }),
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: DesignerAdminRow) => row.slug,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: DesignerAdminRow) => row.sortOrder,
    }),
    textColumn({
      id: "productCount",
      label: t("admin.designer.field.products"),
      access: (row: DesignerAdminRow) =>
        `${row.productCount} ${t("admin.table.rowsSelected").replace("{count}", "")}`,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: DesignerAdminRow } }) => (
        <RowActions
          editHref=""
          onEdit={() => setEditingId(ctx.row.original.id)}
          onDestroy={() => destroy(ctx.row.original.id)}
          deleteWarning={
            ctx.row.original.productCount > 0
              ? t("admin.crud.deleteCascadeCount").replace(
                  "{count}",
                  String(ctx.row.original.productCount),
                )
              : undefined
          }
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
            href="/admin/designers/new"
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
        <DesignerDialog
          open
          onClose={() => {
            setIsCreating(false);
          }}
          onSave={async (values) => {
            const result = await run(() => createDesignerAction(values), {
              successMessage: t("admin.crud.created"),
            });
            return result?.ok ?? false;
          }}
        />
      )}

      {editingId && (
        <DesignerDialog
          open
          initialData={rows.find((r) => r.id === editingId)}
          onClose={() => {
            setEditingId(null);
          }}
          onSave={async (values) => {
            const result = await run(
              () => updateDesignerAction(editingId!, values),
              {
                successMessage: t("admin.table.saved"),
              },
            );
            return result?.ok ?? false;
          }}
        />
      )}
    </div>
  );
}

type DesignerDialogValues = {
  slug: string;
  name: { en: string; fa: string };
  image: string;
  website: string | null;
  bio: { en: string; fa: string }[];
  sortOrder: number;
};

function DesignerDialog({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: DesignerDialogValues) => Promise<boolean>;
  initialData?: Partial<DesignerDialogValues> & { id?: string };
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(initialData);

  const form = useForm({
    resolver: zodResolver(designerFormSchema),
    values: initialData
      ? {
          ...initialData,
          website: initialData.website ?? null,
          bio: initialData.bio ?? [{ en: "", fa: "" }],
          name: initialData.name ?? { en: "", fa: "" },
          slug: initialData.slug ?? "",
          image: initialData.image ?? "",
          sortOrder: initialData.sortOrder ?? 0,
        }
      : {
          slug: "",
          name: { en: "", fa: "" },
          image: "",
          website: null,
          bio: [{ en: "", fa: "" }],
          sortOrder: 0,
        },
  });

  const handleSubmit = form.handleSubmit(async (raw) => {
    setPending(true);
    try {
      const saved = await onSave(raw);
      if (saved) onClose();
    } catch {
      // handled by run()
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("admin.product.edit") : t("admin.product.new")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormProvider {...form}>
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
            <TextField
              name="image"
              label={t("admin.designer.field.image")}
              required
              placeholder="https://..."
              mono
            />
            <TextField
              name="website"
              label={t("admin.designer.field.website")}
              optional
              placeholder="https://..."
              mono
            />
            <LocalizedListField
              name="bio"
              label={t("admin.designer.field.bio")}
              hint={t("admin.designer.field.bioHint")}
              textarea
              rows={3}
              addLabel={t("admin.crud.add")}
            />
            <NumberField
              name="sortOrder"
              label={t("admin.product.field.sortOrder")}
              min={0}
            />
          </FormProvider>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              {t("admin.crud.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("admin.table.saving") : t("admin.crud.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
