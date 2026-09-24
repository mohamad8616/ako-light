"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import {
  LocalizedLabeledRowsField,
  MixedListField,
  StringListField,
} from "@/components/admin/catalog/fields/ListFields";
import {
  NumberField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { SlugField } from "@/components/admin/catalog/fields/SlugField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createFlagshipAction,
  destroyFlagshipAction,
  updateFlagshipAction,
} from "@/lib/admin/actions/flagships";
import {
  flagshipFormSchema,
  type FlagshipFormValues,
} from "@/lib/admin/schemas/flagship";
import type { FlagshipDetail } from "@/lib/data/flagships";
import type { FlagshipWriteInput } from "@/lib/repositories/flagships";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as React from "react";

/**
 * The full flagship form — a dedicated page because of the nested `detail`
 * block. Same zod schema the action re-runs; `values` (not `defaultValues`)
 * keeps the form on server truth.
 *
 * The detail block is all-or-nothing: a switch flips `detail` between SQL NULL
 * (summary-only store) and a complete skeleton, so the schema never sees a
 * half-filled block. The sub-form's list fields reuse the kit's established
 * pattern for nested rows (MixedListField for addressLines, the shared
 * LabeledRows field for hours, StringListField for the gallery).
 */
export function FlagshipForm({
  detail,
  id,
}: {
  detail?: FlagshipWriteInput | null;
  /** Present on the edit page (the row's id, used by update/delete). */
  id?: string;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const [confirming, setConfirming] = React.useState(false);
  const isEdit = Boolean(id && detail);

  const form = useForm<FlagshipFormValues>({
    resolver: zodResolver(flagshipFormSchema),
    values: detail ?? {
      slug: "",
      name: { en: "", fa: "" },
      city: { en: "", fa: "" },
      image: "",
      detail: null,
      sortOrder: 0,
    },
  });

  const hasDetail = useWatch({ control: form.control, name: "detail" }) != null;

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () =>
        id ? updateFlagshipAction(id, values) : createFlagshipAction(values),
      {
        successMessage: isEdit
          ? t("admin.table.saved")
          : t("admin.crud.created"),
        onSuccess: (newId) => {
          if (!id && newId) {
            router.push(getLocalizedPath(`/admin/flagships/${newId}`, lang));
          }
        },
      },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.flagship.card.identity")}>
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
            <LocalizedField
              name="city"
              label={t("admin.flagship.field.city")}
              required
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
        <FormCard
          title={t("admin.flagship.card.detail")}
          description={t("admin.flagship.card.detailHint")}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <div className="space-y-0.5">
                <span className="text-foreground text-xs font-medium">
                  {t("admin.flagship.field.hasDetail")}
                </span>
                <p className="text-muted-foreground text-[11px]">
                  {t("admin.flagship.field.hasDetailHint")}
                </p>
              </div>
              <Switch
                checked={hasDetail}
                onCheckedChange={(checked) =>
                  form.setValue("detail", checked ? emptyDetail() : null, {
                    shouldValidate: false,
                  })
                }
              />
            </div>

            {hasDetail ? (
              <div className="space-y-5">
                <LocalizedField
                  name="detail.heading"
                  label={t("admin.flagship.field.heading")}
                  required
                />
                <LocalizedField
                  name="detail.description"
                  label={t("admin.product.field.description")}
                  required
                  textarea
                  rows={4}
                />
                <TextField
                  name="detail.heroImage"
                  label={t("admin.flagship.field.heroImage")}
                  required
                  placeholder="https://..."
                  mono
                />

                <div className="grid gap-5 lg:grid-cols-2">
                  <LocalizedField
                    name="detail.info.name"
                    label={t("admin.flagship.field.detailName")}
                    required
                  />
                  <LocalizedField
                    name="detail.info.appointmentNote"
                    label={t("admin.flagship.field.appointmentNote")}
                    required
                  />
                  <TextField
                    name="detail.info.phone"
                    label={t("admin.flagship.field.phone")}
                    required
                  />
                  <TextField
                    name="detail.info.email"
                    label={t("admin.flagship.field.email")}
                    required
                  />
                </div>

                <MixedListField
                  name="detail.info.addressLines"
                  label={t("admin.flagship.field.addressLines")}
                  hint={t("admin.flagship.field.addressLinesHint")}
                />
                <LocalizedLabeledRowsField
                  name="detail.info.hours"
                  label={t("admin.flagship.field.hours")}
                  valueName="value"
                  valuePlaceholder="09:30 – 18:30"
                />

                <div className="grid gap-5 lg:grid-cols-2">
                  <TextField
                    name="detail.video.thumbnail"
                    label={t("admin.flagship.field.videoThumbnail")}
                    required
                    placeholder="https://..."
                    mono
                  />
                  <TextField
                    name="detail.video.url"
                    label={t("admin.flagship.field.videoUrl")}
                    required
                    placeholder="https://..."
                    mono
                  />
                </div>
                <StringListField
                  name="detail.gallery"
                  label={t("admin.flagship.field.gallery")}
                  placeholder="https://..."
                />

              </div>
            ) : null}
          </div>
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
              warning={t("admin.flagship.deleteWarning")}
              onConfirm={async () => {
                const result = await run(() => destroyFlagshipAction(id), {
                  successMessage: t("admin.crud.deleted"),
                });
                if (result?.ok) {
                  router.push(getLocalizedPath("/admin/flagships", lang));
                }
              }}
            />
          </FormCard>
        ) : null}
      </FormProvider>

      <div className="flex items-center justify-end gap-2">
        <LocaleLink
          href="/admin/flagships"
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

/**
 * The empty detail skeleton the switch writes when a store gets a detail page.
 * Every required nested field starts blank, so the schema's rules surface as
 * ordinary field errors rather than an unvalidatable half-built block.
 */
function emptyDetail(): FlagshipDetail {
  return {
    heroImage: "",
    heading: { en: "", fa: "" },
    description: { en: "", fa: "" },
    info: {
      name: { en: "", fa: "" },
      addressLines: [],
      hours: [],
      appointmentNote: { en: "", fa: "" },
      phone: "",
      email: "",
    },
    video: { thumbnail: "", url: "" },
    gallery: [],
  };
}


