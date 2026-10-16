"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import { ProductsUsedField } from "@/components/admin/catalog/fields/ProductsUsedField";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { ImageListField, ImageUpload } from "@/components/admin/ImageUpload";
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
 * The full project form — a dedicated page because of its array fields plus the
 * many-to-many product relation. Same zod schema the action re-runs.
 *
 * BOTH hero/gallery images use the SHARED media field (`ImageUpload` for the
 * still, `ImageListField` for the gallery), exactly like the product and about
 * forms: upload a file or pick one from the library, see a preview, remove with
 * ×. They were plain URL text inputs before, which meant the one thing an
 * operator actually wants to do with a photo — put a new one there — could only
 * be done by uploading elsewhere and pasting a link.
 *
 * The two sections UNDER the gallery each get their own photo and copy here
 * instead of being read positionally out of the gallery. Every field is
 * clearable, and empty means "keep using the gallery photo / its paragraph", so
 * an untouched form saves nothing.
 *
 * The product relation reuses the SAME kit pattern Product's image manager
 * established for "a list of related rows inside one form": one ordered row per
 * entry with reorder/remove controls plus an add control. `ProductsUsedField` is
 * that component for `productIds`, and it adds a category step so the product
 * menu only ever lists one category.
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
  const { run, pending, applyFieldIssues, notifyInvalid } = useCrudSubmit();
  const [confirming, setConfirming] = React.useState(false);
  const isEdit = Boolean(id && detail);

  /**
   * The form's seed values, with a STABLE IDENTITY — see the long note in
   * `ProductForm`. `useForm({ values })` is REACTIVE: react-hook-form resets
   * the form whenever the `values` prop changes by deep-equality, and a fresh
   * literal here changes identity on every render. A reset discards anything
   * written only through `setValue` — which is exactly how `moreDescription`,
   * `credits`, `portfolioImages` (`ImageListField` / the list helpers) and
   * `productIds` (`ProductsUsedField`) are stored. Without this memo a save
   * right after editing one of those arrays persisted the ORIGINAL server
   * value while toasting success.
   */
  const seed = React.useMemo<ProjectFormValues>(
    () =>
      detail ?? {
        slug: "",
        name: { en: "", fa: "" },
        location: "",
        year: "",
        image: "",
        description: { en: "", fa: "" },
        paragraph: { en: "", fa: "" },
        moreDescription: [],
        credits: [],
        portfolioImages: [],
        textImageUrl: "",
        textImageText: { en: "", fa: "" },
        fullImageUrl: "",
        fullImageCaption: { en: "", fa: "" },
        sortOrder: 0,
        productIds: [],
      },
    // `detail` IS the row: a new row arrives as a fresh object from the server,
    // so it alone decides the seed. `id` is read outside the memo (isEdit), and
    // listing it here would only re-seed needlessly.
    [detail],
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    values: seed,
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
  }, notifyInvalid);

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
          {/*
            Credits are ALWAYS an EN/FA pair. They used to be a mixed
            string-or-pair list behind a toggle, which made the ordinary case —
            type the credit in both languages — a two-step dance and left a plain
            string with no per-language editing at all. The repository widens a
            legacy plain string into a pair on read, so this field can assume
            pairs without a migration.
          */}
          <LocalizedListField
            name="credits"
            label={t("admin.project.field.credits")}
            hint={t("admin.project.field.creditsHint")}
            addLabel={t("admin.crud.add")}
          />
        </FormCard>

        <FormCard title={t("admin.project.card.media")}>
          <div className="space-y-5">
            <ImageUpload
              name="image"
              label={t("admin.project.field.image")}
              hint={t("admin.project.field.imageHint")}
              folder="projects"
              required
            />
            <ImageListField
              name="portfolioImages"
              label={t("admin.project.field.portfolioImages")}
              hint={t("admin.project.field.portfolioImagesHint")}
              folder="projects"
              addLabel={t("admin.crud.add")}
            />
          </div>
        </FormCard>

        {/*
          The two sections that render UNDER the gallery. Each used to be
          positional — the first always took `portfolioImages[0]` with
          `moreDescription[0]`, the second `[1]` — so changing either photo meant
          changing the gallery and changing either text meant editing the shared
          "more description" list. They now own their photo and their copy.

          Every field is CLEARABLE and empty means "keep using the gallery photo
          / its paragraph", so an untouched form changes nothing and an existing
          project keeps rendering exactly as it does today.
        */}
        <FormCard
          title={t("admin.project.card.textImageSection")}
          description={t("admin.project.card.textImageSectionHint")}
        >
          <div className="space-y-5">
            <ImageUpload
              name="textImageUrl"
              label={t("admin.project.field.sectionImage")}
              hint={t("admin.project.field.sectionImageHint")}
              folder="projects"
            />
            <LocalizedField
              name="textImageText"
              label={t("admin.project.field.sectionText")}
              hint={t("admin.project.field.sectionTextHint")}
              textarea
              rows={4}
            />
          </div>
        </FormCard>

        <FormCard
          title={t("admin.project.card.fullImageSection")}
          description={t("admin.project.card.fullImageSectionHint")}
        >
          <div className="space-y-5">
            <ImageUpload
              name="fullImageUrl"
              label={t("admin.project.field.sectionImage")}
              hint={t("admin.project.field.sectionImageHint")}
              folder="projects"
            />
            <LocalizedField
              name="fullImageCaption"
              label={t("admin.project.field.sectionCaption")}
              hint={t("admin.project.field.sectionCaptionHint")}
              textarea
              rows={3}
            />
          </div>
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

