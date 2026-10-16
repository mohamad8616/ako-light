"use client";

/**
 * The catalogue slot form — the `catalogue` row the homepage's CatalogueSection
 * reads.
 *
 * The section's title and PDF link are read straight off the referenced
 * CatalogueItem, so the form chooses WHICH item the section shows, owns the
 * section photo, and owns the section's PARAGRAPH. There is no mode toggle:
 * every field here is either the reference or the slot's own value.
 *
 * The paragraph is optional. Left empty, the public section falls back to the
 * static `catalogue.description` translation — which is exactly what every row
 * saved before this field existed does, so nothing goes blank.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField, LocalizedListField } from "@/components/admin/catalog/fields/LocalizedField";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import { SwitchField, TextField } from "@/components/admin/catalog/fields/ScalarFields";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PdfUpload } from "@/components/admin/PdfUpload";
import { SectionFormActions } from "@/components/admin/catalog/page-sections/SectionFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import {
  updateCatalogueFeatureAction,
} from "@/lib/admin/actions/homepage";
import {
  catalogueFeatureFormSchema,
  type CatalogueFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc, type Localized } from "@/lib/i18n/localized";
import type { CatalogueItemAdminRow } from "@/lib/repositories/catalogue";
import type { CatalogueFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** What a cleared localized pair looks like in the form (saved as SQL NULL). */
const CLEARED: Localized = loc("", "");

export function CatalogueFeatureForm({  detail,
  catalogueItems,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: CatalogueFeatureWriteInput | null;
  /** Picker source — every catalogue item, in curated display order. */
  catalogueItems: CatalogueItemAdminRow[];
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues, notifyInvalid } = useCrudSubmit();

  const form = useForm<CatalogueFeatureFormValues>({
    resolver: zodResolver(catalogueFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      // The FK is required, so an unseeded slot pre-selects the first item.
      catalogueItemId: detail?.catalogueItemId ?? catalogueItems[0]?.id ?? "",
      image: detail?.image ?? "",
      paragraphs: detail?.paragraphs ?? [],
      ctaLabel: detail?.ctaLabel ?? CLEARED,
      ctaHref: detail?.ctaHref ?? "",
      ctaPdfUrl: detail?.ctaPdfUrl ?? "",
      ctaPdfName: detail?.ctaPdfName ?? "",
    },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      const result = await run(() => updateCatalogueFeatureAction(values), {
        successMessage: t("admin.table.saved"),
      });
      if (result && !result.ok) applyFieldIssues(form, result);
    },
    // A rejected submit must SAY so — see useCrudSubmit#notifyInvalid.
    notifyInvalid,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.content")}>
          <div className="space-y-5">
            <SwitchField
              name="enabled"
              label={t("admin.homepage.field.enabled")}
              description={t("admin.homepage.field.enabledHint")}
            />
            <SelectField
              name="catalogueItemId"
              label={t("admin.homepage.field.catalogueItem")}
              hint={t("admin.homepage.field.catalogueItemHint")}
              options={catalogueItems.map((row) => ({
                value: row.id,
                label: row.title,
              }))}
            />
            <ImageUpload
              name="image"
              label={t("admin.homepage.field.image")}
              required
              folder="homepage"
            />
          </div>
        </FormCard>
        <FormCard
          title={t("admin.homepage.card.catalogueCopy")}
          description={t("admin.homepage.card.catalogueCopyHint")}
        >
          <LocalizedListField
            name="paragraphs"
            label={t("admin.homepage.field.paragraphs")}
            optional
            textarea
          />
        </FormCard>
        <FormCard
          title={t("admin.homepage.card.catalogueCta")}
          description={t("admin.homepage.card.catalogueCtaHint")}
        >
          <div className="space-y-5">
            {/* The PDF is FIRST because it is the destination of record: an
                uploaded file outranks a pasted link (see the repository's
                resolution order). */}
            <PdfUpload
              urlName="ctaPdfUrl"
              nameName="ctaPdfName"
              label={t("admin.homepage.field.ctaPdf")}
              hint={t("admin.upload.pdfDownloadHint")}
            />
            <LocalizedField
              name="ctaLabel"
              label={t("admin.homepage.field.ctaLabel")}
              optional
            />
            <TextField
              name="ctaHref"
              label={t("admin.homepage.field.ctaHref")}
              hint={t("admin.homepage.field.ctaHrefHint")}
              optional
              placeholder="https://example.com/file.pdf  ·  /catalogue/s34-5"
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}
