"use client";

import {
  localizedColumn,
  numberColumn,
  slugColumn,
  textColumn,
} from "@/components/admin/catalog/columns";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
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
  createProductCategoryAction,
  destroyProductCategoryAction,
  updateProductCategoryAction,
} from "@/lib/admin/actions/product-categories";
import { productCategoryFormSchema } from "@/lib/admin/schemas/product-category";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LocaleLink from "@/lib/i18n/Link";
import type { ProductCategoryAdminRow } from "@/lib/repositories/product-categories";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";

/**
 * The categories list screen — same DataTable pattern as products, but the
 * create/edit forms live in a dialog.
 */
export function ProductCategoriesTable({
  rows,
}: {
  rows: ProductCategoryAdminRow[];
}) {
  const { t, lang } = useLanguage();
  const { run } = useCrudSubmit();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const destroy = (id: string) =>
    run(() => destroyProductCategoryAction(id), {
      successMessage: t("admin.crud.deleted"),
    });

  const columns = [
    localizedColumn({
      lang,
      label: t("admin.nav.categories"),
      access: (row: ProductCategoryAdminRow) => row.name,
    }),
    textColumn({
      id: "i18nKey",
      label: t("admin.productCategory.field.i18nKey"),
      access: (row: ProductCategoryAdminRow) => row.i18nKey,
    }),
    slugColumn({
      label: t("admin.product.field.slug"),
      access: (row: ProductCategoryAdminRow) => row.slug,
    }),
    numberColumn({
      id: "sortOrder",
      label: t("admin.product.field.sortOrder"),
      lang,
      access: (row: ProductCategoryAdminRow) => row.sortOrder,
    }),
    textColumn({
      id: "productCount",
      label: t("admin.product.field.category"),
      access: (row: ProductCategoryAdminRow) =>
        `${row.productCount} ${t("admin.table.rowsSelected").replace("{count}", "")}`,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx: { row: { original: ProductCategoryAdminRow } }) => (
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
            href="/admin/categories/new"
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
        <CategoryDialog
          open
          onClose={() => {
            setIsCreating(false);
          }}
          onSave={async (values) => {
            const result = await run(
              () => createProductCategoryAction(values),
              {
                successMessage: t("admin.crud.created"),
              },
            );
            return result?.ok ?? false;
          }}
        />
      )}

      {editingId && (
        <CategoryDialog
          open
          initialData={rows.find((r) => r.id === editingId)!}
          onClose={() => {
            setEditingId(null);
          }}
          onSave={async (values) => {
            const result = await run(
              () => updateProductCategoryAction(editingId!, values),
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

function CategoryDialog({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: {
    slug: string;
    i18nKey: string;
    name: { en: string; fa: string };
    sortOrder: number;
  }) => Promise<boolean>;
  initialData?: {
    id: string;
    slug: string;
    i18nKey: string;
    name: { en: string; fa: string };
    sortOrder: number;
  };
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(initialData);

  const form = useForm({
    resolver: zodResolver(productCategoryFormSchema),
    values: initialData ?? {
      slug: "",
      i18nKey: "",
      name: { en: "", fa: "" },
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
      <DialogContent className="sm:max-w-lg">
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
              name="i18nKey"
              label={t("admin.productCategory.field.i18nKey")}
              required
              placeholder="products.coffeeTables"
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
