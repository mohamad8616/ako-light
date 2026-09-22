"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedLabeledRowsField } from "@/components/admin/catalog/fields/ListFields";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import {
  ProductImagesField,
  RelatedField,
} from "@/components/admin/catalog/fields/ProductFields";
import {
  NumberField,
  SwitchField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createProductAction,
  destroyProductAction,
  updateProductAction,
} from "@/lib/admin/actions/products";
import { productFormSchema } from "@/lib/admin/schemas/product";
import type { DesignerOption } from "@/lib/repositories/designers";
import type { ProductCategoryOption } from "@/lib/repositories/product-categories";
import type { ProductAdminDetail } from "@/lib/repositories/products";
import LocaleLink from "@/lib/i18n/Link";
import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as React from "react";

/**
 * The full product form — every `Product` column via the shared kit. Same zod
 * schema the action re-runs. `categoryLabel` is not a field (derived, no
 * column). `values` (not defaultValues) keeps the form on server truth.
 */
export function ProductForm({
  detail,
  categories,
  designers,
}: {
  detail?: ProductAdminDetail | null;
  categories: ProductCategoryOption[];
  designers: DesignerOption[];
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const [confirming, setConfirming] = React.useState(false);
  const isEdit = Boolean(detail);

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    values: detail
      ? {
          ...detail,
          // The server detail maps SQL NULL to `undefined`; the schema's input
          // needs `Localized | null`, so normalize it to match (same pattern
          // as `DesignersTable`).
          moreInfo: detail.moreInfo ?? null,
        }
      : {
          slug: "",
          name: { en: "", fa: "" },
          hoverImage: "",
          heroImage: "",
          price: 0,
          existsInStore: false,
          quantity: 0,
          description: { en: "", fa: "" },
          moreInfo: null,
          downloads: [],
          related: [],
          sortOrder: 0,
          categoryId: categories[0]?.id ?? "",
          designerId: null,
          images: [],
        },
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: pick(category.name, lang),
  }));
  const designerOptions = designers.map((designer) => ({
    value: designer.id,
    label: pick(designer.name, lang),
  }));
  const moreInfo = useWatch({ control: form.control, name: "moreInfo" });

  const onSubmit = form.handleSubmit(async (raw) => {
    // Empty localized pairs and blank alt text normalize to null so the
    // schema's non-empty rules never see a meaningless "" that blocks save.
    const values = {
      ...raw,
      moreInfo:
        raw.moreInfo && (raw.moreInfo.en.trim() || raw.moreInfo.fa.trim())
          ? raw.moreInfo
          : null,
      images: raw.images.map((image) => ({ ...image, alt: image.alt || null })),
    };

    const result = await run(
      () =>
        detail
          ? updateProductAction(detail.id, values)
          : createProductAction(values),
      {
        successMessage: detail
          ? t("admin.table.saved")
          : t("admin.crud.created"),
        onSuccess: (id) => {
          if (!detail && id) {
            router.push(getLocalizedPath(`/admin/products/${id}`, lang));
          }
        },
      },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.product.card.identity")}>
          <div className="grid gap-5 lg:grid-cols-2">
            <LocalizedField
              name="name"
              label={t("admin.product.field.name")}
              required
              className="lg:col-span-2"
            />
            <SlugField
              name="slug"
              label={t("admin.product.field.slug")}
              source="name.en"
              required
            />
            <NumberField
              name="sortOrder"
              label={t("admin.product.field.sortOrder")}
              min={0}
            />
            <SelectField
              name="categoryId"
              label={t("admin.product.field.category")}
              required
              options={categoryOptions}
            />
            <SelectField
              name="designerId"
              label={t("admin.product.field.designer")}
              options={designerOptions}
              allowEmpty
              emptyLabel={t("admin.crud.optional")}
              placeholder={t("admin.product.field.designer")}
            />
          </div>
        </FormCard>

        <FormCard title={t("admin.product.card.pricing")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              name="price"
              label={t("admin.product.field.price")}
              required
              min={0}
              step={0.01}
            />
            <NumberField
              name="quantity"
              label={t("admin.product.field.quantity")}
              min={0}
            />
          </div>
          <SwitchField
            name="existsInStore"
            label={t("admin.product.field.existsInStore")}
          />
        </FormCard>

        <FormCard title={t("admin.product.card.media")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="hoverImage"
              label={t("admin.product.field.hoverImage")}
              required
              placeholder="https://…"
              mono
            />
            <TextField
              name="heroImage"
              label={t("admin.product.field.heroImage")}
              required
              placeholder="https://…"
              mono
            />
          </div>
          <ProductImagesField
            name="images"
            label={t("admin.product.field.images")}
          />
        </FormCard>

        <FormCard title={t("admin.product.card.content")}>
          <LocalizedField
            name="description"
            label={t("admin.product.field.description")}
            required
            textarea
            rows={4}
          />
          <MoreInfoField
            hasMoreInfo={moreInfo != null}
            onToggle={(checked) =>
              form.setValue("moreInfo", checked ? { en: "", fa: "" } : null, {
                shouldValidate: false,
              })
            }
            label={t("admin.product.field.moreInfo")}
          />
        </FormCard>

        {/* EXTRAS_BLOCK */}
        <FormCard title={t("admin.product.card.extras")}>
          <LocalizedLabeledRowsField
            name="downloads"
            label={t("admin.product.field.downloads")}
            valueName="href"
            valuePlaceholder={t("admin.product.field.href")}
          />
          <RelatedField
            name="related"
            label={t("admin.product.field.related")}
          />
        </FormCard>
      </FormProvider>

      <div className="flex items-center justify-end gap-2">
        <LocaleLink
          href="/admin/products"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("admin.crud.cancel")}
        </LocaleLink>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("admin.table.saving") : t("admin.crud.save")}
        </Button>
      </div>

      {isEdit && detail ? (
        <FormCard
          title={t("admin.product.card.danger")}
          className="border-destructive/30"
        >
          <p className="text-muted-foreground text-xs">
            {t("admin.crud.deleteDescription")}
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            {t("admin.table.delete")}
          </Button>
          <DeleteDialog
            open={confirming}
            onOpenChange={setConfirming}
            warning={t("admin.product.deleteWarning")}
            onConfirm={async () => {
              const result = await run(() => destroyProductAction(detail.id), {
                successMessage: t("admin.crud.deleted"),
              });
              if (result?.ok) {
                router.push(getLocalizedPath("/admin/products", lang));
              }
            }}
          />
        </FormCard>
      ) : null}
    </form>
  );
}

/**
 * Nullable `moreInfo` pair: a switch flips the value between SQL NULL and an
 * {en, fa} object, so the schema never sees a meaningless {en:"",fa:""} that
 * would block save on the pair rules. The parent owns the form state — this
 * takes only a boolean and a toggle, never the form object (its generics make
 * passing the whole form across components a type error).
 */
function MoreInfoField({
  hasMoreInfo,
  onToggle,
  label,
}: {
  hasMoreInfo: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground text-xs font-medium">{label}</span>
        <Switch checked={hasMoreInfo} onCheckedChange={onToggle} />
      </div>
      {hasMoreInfo ? (
        <LocalizedField name="moreInfo" label={label} textarea rows={3} />
      ) : null}
    </div>
  );
}
