"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import {
  MixedListField,
  StringListField,
} from "@/components/admin/catalog/fields/ListFields";
import { ProductsUsedField } from "@/components/admin/catalog/fields/ProductsUsedField";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createProjectAction,
  destroyProjectAction,
  updateProjectAction,
} from "@/lib/admin/actions/projects";
import {
  projectFormSchema,
  type ProjectFormValues,
} from "@/lib/admin/schemas/project";
import type { ProductOption } from "@/lib/repositories/products";
import type { ProjectWriteInput } from "@/lib/repositories/projects";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import * as React from "react";

/**
 * The full project form — a dedicated page because of its three array fields
 * plus the many-to-many product relation. Same zod schema the action re-runs.
 *
 * The product relation reuses the SAME kit pattern Product's image manager
 * established for "a list of related rows inside one form": one ordered row
 * per entry with reorder/remove controls plus an add-select.
 * `ProductsUsedField` is that component for `productIds` (joined rows instead
 * of image rows), so no new sub-form pattern is invented here.
 */
export function ProjectForm({
  detail,
  id,
  products,
}: {
  detail?: ProjectWriteInput | null;
  /** Present on the edit page (the row's id, used by update/delete). */
  id?: string;
  /** Picker options for the ordered products-used field. */
  products: ProductOption[];
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const [confirming, setConfirming] = React.useState(false);
  const isEdit = Boolean(id && detail);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    values: detail ?? {
      slug: "",
      i18nKey: "",
      name: { en: "", fa: "" },
      location: "",
      year: "",
      image: "",
      description: { en: "", fa: "" },
      paragraph: { en: "", fa: "" },
      moreDescription: [],
      credits: [],
      portfolioImages: [],
      sortOrder: 0,
      productIds: [],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => (id ? updateProjectAction(id, values) : createProjectAction(values)),
      {
        successMessage: isEdit
          ? t("admin.table.saved")
          : t("admin.crud.created"),
        onSuccess: (newId) => {
          if (!id && newId) {
            router.push(getLocalizedPath(`/admin/projects/${newId}`, lang));
          }
        },
      },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.project.card.identity")}>
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
            <TextField
              name="i18nKey"
              label={t("admin.project.field.i18nKey")}
              required
              placeholder="projects.hIstra"
              mono
            />
            <TextField
              name="location"
              label={t("admin.project.field.location")}
              required
            />
            <TextField
              name="year"
              label={t("admin.collection.field.year")}
              required
              dir="ltr"
              placeholder="2026"
            />
            <TextField
              name="image"
              label={t("admin.designer.field.image")}
              required
              placeholder="https://..."
              mono
            />
            <NumberField
              name="sortOrder"
              label={t("admin.product.field.sortOrder")}
              min={0}
            />
          </div>
        </FormCard>

        <FormCard title={t("admin.project.card.content")}>
          <LocalizedField
            name="description"
            label={t("admin.product.field.description")}
            required
            textarea
            rows={3}
          />
          <LocalizedField
            name="paragraph"
            label={t("admin.project.field.paragraph")}
            required
            textarea
            rows={4}
          />
          <LocalizedListField
            name="moreDescription"
            label={t("admin.project.field.moreDescription")}
            textarea
            rows={3}
          />
          <MixedListField
            name="credits"
            label={t("admin.project.field.credits")}
            hint={t("admin.project.field.creditsHint")}
          />
        </FormCard>

        <FormCard title={t("admin.project.card.media")}>
          <StringListField
            name="portfolioImages"
            label={t("admin.project.field.portfolioImages")}
            placeholder="https://..."
          />
        </FormCard>

        <FormCard title={t("admin.project.card.products")}>
          <ProductsUsedField
            name="productIds"
            label={t("admin.project.field.productsUsed")}
            hint={t("admin.project.field.productsUsedHint")}
            products={products}
          />
        </FormCard>

        {isEdit && id ? (
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
              warning={t("admin.project.deleteWarning")}
              onConfirm={async () => {
                const result = await run(() => destroyProjectAction(id), {
                  successMessage: t("admin.crud.deleted"),
                });
                if (result?.ok) {
                  router.push(getLocalizedPath("/admin/projects", lang));
                }
              }}
            />
          </FormCard>
        ) : null}
      </FormProvider>

      <div className="flex items-center justify-end gap-2">
        <LocaleLink
          href="/admin/projects"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("admin.crud.cancel")}
        </LocaleLink>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("admin.table.saving") : t("admin.crud.save")}
        </Button>
      </div>
    </form>
  );
}

