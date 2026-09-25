"use client";

/**
 * The project-banner slot form — the `project-banner` row the homepage's
 * ProjectBanner reads.
 *
 * Same shape as the flagship slot: a required project FK (the CTA is always that
 * project's canonical route) plus clearable kicker/title/image overrides. This
 * slot carries no paragraphs — the banner is copy-light by design.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import { TextField } from "@/components/admin/catalog/fields/ScalarFields";
import {
  HomepageFormActions,
  HomepageOverrideCard,
  HomepageSlotFields,
} from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateProjectBannerFeatureAction } from "@/lib/admin/actions/homepage";
import {
  projectBannerFeatureFormSchema,
  type ProjectBannerFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc, pick, type Localized } from "@/lib/i18n/localized";
import type { ProjectBannerFeatureWriteInput } from "@/lib/repositories/homepage-features";
import type { ProjectAdminRow } from "@/lib/repositories/projects";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** What a cleared override pair looks like in the form (saved as SQL NULL). */
const CLEARED: Localized = loc("", "");

export function ProjectBannerFeatureForm({
  detail,
  projects,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: ProjectBannerFeatureWriteInput | null;
  /** Picker source — every project, in curated display order. */
  projects: ProjectAdminRow[];
}) {
  const { t, lang } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<ProjectBannerFeatureFormValues>({
    resolver: zodResolver(projectBannerFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      mode: detail?.mode ?? "reference",
      projectId: detail?.projectId ?? projects[0]?.id ?? "",
      kicker: detail?.kicker ?? CLEARED,
      title: detail?.title ?? CLEARED,
      image: detail?.image ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateProjectBannerFeatureAction(values), {
      successMessage: t("admin.table.saved"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.content")}>
          <HomepageSlotFields
            entityName="projectId"
            entityLabel={t("admin.homepage.field.project")}
            entityOptions={projects.map((row) => ({
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
