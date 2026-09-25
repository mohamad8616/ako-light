"use client";

/**
 * The flagship-one slot form — the `flagship-one` row the homepage's FlagshipOne
 * banner reads (app/[locale]/(site)/page.tsx).
 *
 * The slot always points at a flagship (its id is the FK; the CTA is computed
 * from the flagship's slug), so the form's job is: choose WHICH flagship, pick
 * reference or override mode, and — in override mode — optionally replace the
 * kicker, title, paragraphs and image. A blank override field stays NULL and
 * the banner keeps the flagship's own value, which is why the overrides are
 * clearable pairs/lists rather than required fields.
 *
 * A dedicated page (not a dialog) because the override card is a full form
 * section; the page shell lives at
 * app/[locale]/(admin)/admin/homepage/[slot]/page.tsx.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import { TextField } from "@/components/admin/catalog/fields/ScalarFields";
import {
  HomepageFormActions,
  HomepageOverrideCard,
  HomepageSlotFields,
} from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateFlagshipOneFeatureAction } from "@/lib/admin/actions/homepage";
import {
  flagshipOneFeatureFormSchema,
  type FlagshipOneFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc, pick, type Localized } from "@/lib/i18n/localized";
import type { FlagshipAdminRow } from "@/lib/repositories/flagships";
import type { FlagshipOneFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** What a cleared override pair looks like in the form (saved as SQL NULL). */
const CLEARED: Localized = loc("", "");

export function FlagshipOneFeatureForm({
  detail,
  flagships,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: FlagshipOneFeatureWriteInput | null;
  /** Picker source — every flagship, in curated display order. */
  flagships: FlagshipAdminRow[];
}) {
  const { t, lang } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<FlagshipOneFeatureFormValues>({
    resolver: zodResolver(flagshipOneFeatureFormSchema),
    // `values` (not `defaultValues`) keeps the form on server truth whenever the
    // action's revalidation re-renders this page.
    values: {
      enabled: detail?.enabled ?? true,
      mode: detail?.mode ?? "reference",
      // A slot that was never seeded pre-selects the first flagship so the form
      // saves a valid row (the FK is required) instead of an empty id.
      flagshipId: detail?.flagshipId ?? flagships[0]?.id ?? "",
      kicker: detail?.kicker ?? CLEARED,
      title: detail?.title ?? CLEARED,
      paragraphs: detail?.paragraphs ?? [],
      image: detail?.image ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateFlagshipOneFeatureAction(values), {
      successMessage: t("admin.table.saved"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.content")}>
          <HomepageSlotFields
            entityName="flagshipId"
            entityLabel={t("admin.homepage.field.flagship")}
            entityOptions={flagships.map((row) => ({
              value: row.id,
              label: pick(row.name, lang),
            }))}
          />
        </FormCard>
        <HomepageOverrideCard>
          <LocalizedField
            name="kicker"
            label={t("admin.homepage.field.kicker")}
            optional
          />
          <LocalizedField
            name="title"
            label={t("admin.homepage.field.title")}
            optional
          />
          <LocalizedListField
            name="paragraphs"
            label={t("admin.homepage.field.paragraphs")}
            optional
            textarea
          />
          <TextField
            name="image"
            label={t("admin.homepage.field.image")}
            optional
            placeholder="https://..."
            mono
          />
        </HomepageOverrideCard>
      </FormProvider>
      <HomepageFormActions pending={pending} />
    </form>
  );
}
