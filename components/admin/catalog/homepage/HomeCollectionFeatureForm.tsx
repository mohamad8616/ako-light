"use client";

/**
 * The Home Collection slot form — the `home-collection` row the homepage's
 * HomeCollectionBanner reads.
 *
 * This slot is the one exception to the reference/override model: it owns its
 * content outright (no entity FK, no mode toggle), so every field is required —
 * there is nothing to fall back to. The banner's link is the fixed collections
 * index (`/collections`).
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import {
  SwitchField,
  TextField,
} from "@/components/admin/catalog/fields/ScalarFields";
import { HomepageFormActions } from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateHomeCollectionFeatureAction } from "@/lib/admin/actions/homepage";
import {
  homeCollectionFeatureFormSchema,
  type HomeCollectionFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc } from "@/lib/i18n/localized";
import type { HomeCollectionFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

export function HomeCollectionFeatureForm({
  detail,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: HomeCollectionFeatureWriteInput | null;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<HomeCollectionFeatureFormValues>({
    resolver: zodResolver(homeCollectionFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      image: detail?.image ?? "",
      title: detail?.title ?? loc("", ""),
      text: detail?.text ?? loc("", ""),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateHomeCollectionFeatureAction(values), {
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
            <LocalizedField
              name="title"
              label={t("admin.homepage.field.title")}
              required
            />
            <LocalizedField
              name="text"
              label={t("admin.homepage.field.text")}
              required
              textarea
              rows={4}
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
