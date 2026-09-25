"use client";

/**
 * The dark-background project slot form — the `project-dark-background` row the
 * homepage's ProjectWithDarkBackground reads.
 *
 * Like the other entity-backed slots, but its override set is title +
 * paragraphs + image (no kicker: the dark section is title-led) and the
 * paragraphs are a clearable list — an emptied list means the banner falls back
 * to the project's own description/paragraph pair.
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
import { updateProjectDarkBackgroundFeatureAction } from "@/lib/admin/actions/homepage";
import {
  projectDarkBackgroundFeatureFormSchema,
  type ProjectDarkBackgroundFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc, pick, type Localized } from "@/lib/i18n/localized";
import type { ProjectDarkBackgroundFeatureWriteInput } from "@/lib/repositories/homepage-features";
import type { ProjectAdminRow } from "@/lib/repositories/projects";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** What a cleared override pair looks like in the form (saved as SQL NULL). */
const CLEARED: Localized = loc("", "");

export function ProjectDarkBackgroundFeatureForm({
  detail,
  projects,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: ProjectDarkBackgroundFeatureWriteInput | null;
  /** Picker source — every project, in curated display order. */
  projects: ProjectAdminRow[];
}) {
  const { t, lang } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<ProjectDarkBackgroundFeatureFormValues>({
    resolver: zodResolver(projectDarkBackgroundFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      mode: detail?.mode ?? "reference",
      projectId: detail?.projectId ?? projects[0]?.id ?? "",
      title: detail?.title ?? CLEARED,
      paragraphs: detail?.paragraphs ?? [],
      image: detail?.image ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateProjectDarkBackgroundFeatureAction(values),
      { successMessage: t("admin.table.saved") },
    );
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
