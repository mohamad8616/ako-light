"use client";

/**
 * The catalogue slot form — the `catalogue` row the homepage's CatalogueSection
 * reads.
 *
 * A CatalogueItem carries no image and no title override: the section's title
 * and PDF link are read straight off the referenced item, so the form only
 * chooses WHICH item the section shows and owns the section photo. There is no
 * mode toggle (nothing to override) and no override card.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import {
  SwitchField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { HomepageFormActions } from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import {
  updateCatalogueFeatureAction,
} from "@/lib/admin/actions/homepage";
import {
  catalogueFeatureFormSchema,
  type CatalogueFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { CatalogueItemAdminRow } from "@/lib/repositories/catalogue";
import type { CatalogueFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

export function CatalogueFeatureForm({
  detail,
  catalogueItems,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: CatalogueFeatureWriteInput | null;
  /** Picker source — every catalogue item, in curated display order. */
  catalogueItems: CatalogueItemAdminRow[];
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<CatalogueFeatureFormValues>({
    resolver: zodResolver(catalogueFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      // The FK is required, so an unseeded slot pre-selects the first item.
      catalogueItemId: detail?.catalogueItemId ?? catalogueItems[0]?.id ?? "",
      image: detail?.image ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateCatalogueFeatureAction(values), {
      successMessage: t("admin.table.saved"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

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
            <TextField
              name="image"
              label={t("admin.homepage.field.image")}
              required
              placeholder="https://..."
              mono
            />
          </div>
        </FormCard>
      </FormProvider>
      <HomepageFormActions pending={pending} />
    </form>
  );
}
