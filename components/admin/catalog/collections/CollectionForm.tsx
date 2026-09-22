"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createCollectionAction,
  destroyCollectionAction,
  updateCollectionAction,
} from "@/lib/admin/actions/collections";
import {
  collectionFormSchema,
  type CollectionFormValues,
} from "@/lib/admin/schemas/collection";
import type { CollectionWriteInput } from "@/lib/repositories/collections";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import * as React from "react";

/**
 * The full collection form — a dedicated page (not a dialog) because the fixed
 * {p1,p2,p3} description block alone is six text fields.
 *
 * `description` is written as ONE jsonb value, never per-paragraph patches, and
 * `year` stays a string because the source data uses "2026".
 */
export function CollectionForm({
  detail,
  id,
}: {
  detail?: CollectionWriteInput | null;
  /** Present on the edit page (the row's id, used by update/delete). */
  id?: string;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const [confirming, setConfirming] = React.useState(false);
  const isEdit = Boolean(id && detail);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    values: detail ?? {
      slug: "",
      name: { en: "", fa: "" },
      year: "",
      image: "",
      description: {
        p1: { en: "", fa: "" },
        p2: { en: "", fa: "" },
        p3: { en: "", fa: "" },
      },
      sortOrder: 0,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () =>
        id ? updateCollectionAction(id, values) : createCollectionAction(values),
      {
        successMessage: isEdit
          ? t("admin.table.saved")
          : t("admin.crud.created"),
        onSuccess: (newId) => {
          if (!id && newId) {
            router.push(getLocalizedPath(`/admin/collections/${newId}`, lang));
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
        {/* DESCRIPTION_CARD */}
        <FormCard
          title={t("admin.collection.field.description")}
          description={t("admin.collection.field.descriptionHint")}
        >
          <LocalizedField
            name="description.p1"
            label={t("admin.collection.field.descriptionP1")}
            required
            textarea
            rows={4}
          />
          <LocalizedField
            name="description.p2"
            label={t("admin.collection.field.descriptionP2")}
            required
            textarea
            rows={4}
          />
          <LocalizedField
            name="description.p3"
            label={t("admin.collection.field.descriptionP3")}
            required
            textarea
            rows={4}
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
              onConfirm={async () => {
                const result = await run(() => destroyCollectionAction(id), {
                  successMessage: t("admin.crud.deleted"),
                });
                if (result?.ok) {
                  router.push(getLocalizedPath("/admin/collections", lang));
                }
              }}
            />
          </FormCard>
        ) : null}
      </FormProvider>

      <div className="flex items-center justify-end gap-2">
        <LocaleLink
          href="/admin/collections"
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