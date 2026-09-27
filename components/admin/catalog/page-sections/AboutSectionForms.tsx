"use client";

/**
 * The four About-page section forms (myPlan.md Part D) — one per
 * `AboutPageSection` row, each rendering that section's own shape: the hero's
 * two headline lines, the subtitle paragraph, the brand-story block copy, the
 * elegance paragraphs.
 *
 * Every form is independent (its own react-hook-form instance and save button)
 * because the sections are independent rows the public page renders in order —
 * editing one paragraph never requires re-submitting the whole page.
 *
 * `content` arrives from the page (getAboutPageContent), so the admin edits
 * exactly what the site renders; the server action re-validates the same shape
 * before the repository upsert. Image URLs are NOT here — they stay in
 * lib/data/about.ts (not translation content).
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import { SectionFormActions } from "@/components/admin/catalog/page-sections/SectionFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateAboutPageSectionAction } from "@/lib/admin/actions/about";
import {
  aboutBrandStorySectionSchema,
  aboutEleganceSectionSchema,
  aboutHeroSectionSchema,
  aboutSubtitleSectionSchema,
  type AboutBrandStorySectionFormValues,
  type AboutEleganceSectionFormValues,
  type AboutHeroSectionFormValues,
  type AboutSubtitleSectionFormValues,
} from "@/lib/admin/schemas/about";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type {
  AboutBrandStoryContent,
  AboutEleganceContent,
  AboutHeroContent,
  AboutSubtitleContent,
} from "@/lib/repositories/about-page";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** components/about/AboutHero.tsx — the two headline lines. */
export function AboutHeroSectionForm({
  content,
}: {
  content: AboutHeroContent;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<AboutHeroSectionFormValues>({
    resolver: zodResolver(aboutHeroSectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateAboutPageSectionAction("heroSection", values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t("admin.page.about.section.heroSection")}>
          <div className="space-y-5">
            <LocalizedField
              name="firstLine"
              label={t("admin.page.field.firstLine")}
              required
            />
            <LocalizedField
              name="secondLine"
              label={t("admin.page.field.secondLine")}
              required
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}

/** components/about/AboutHeroVideo.tsx — the paragraph under the hero. */
export function AboutSubtitleSectionForm({
  content,
}: {
  content: AboutSubtitleContent;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<AboutSubtitleSectionFormValues>({
    resolver: zodResolver(aboutSubtitleSectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateAboutPageSectionAction("subtitleSection", values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t("admin.page.about.section.subtitleSection")}>
          <LocalizedField
            name="paragraph"
            label={t("admin.page.field.paragraph")}
            required
            textarea
            rows={3}
          />
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}

/** components/about/BrandStory.tsx — title, intro grid, two image blocks. */
export function AboutBrandStorySectionForm({
  content,
}: {
  content: AboutBrandStoryContent;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<AboutBrandStorySectionFormValues>({
    resolver: zodResolver(aboutBrandStorySectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateAboutPageSectionAction("brandStorySection", values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t("admin.page.about.section.brandStorySection")}>
          <div className="space-y-5">
            <LocalizedField
              name="title"
              label={t("admin.page.field.title")}
              required
            />
            <LocalizedListField
              name="paragraphs"
              label={t("admin.page.field.paragraphs")}
              hint={t("admin.page.field.paragraphsHint")}
              textarea
              rows={4}
              addLabel={t("admin.crud.add")}
            />
            <LocalizedField
              name="block1Alt"
              label={t("admin.page.field.block1Alt")}
              required
            />
            <LocalizedListField
              name="block1Paragraphs"
              label={t("admin.page.field.block1Paragraphs")}
              textarea
              rows={4}
              addLabel={t("admin.crud.add")}
            />
            <LocalizedField
              name="block2Alt"
              label={t("admin.page.field.block2Alt")}
              required
            />
            <LocalizedField
              name="block2Paragraph"
              label={t("admin.page.field.block2Paragraph")}
              required
              textarea
              rows={4}
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}

/** components/about/EleganceSection.tsx — title + the paragraph grid. */
export function AboutEleganceSectionForm({
  content,
}: {
  content: AboutEleganceContent;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<AboutEleganceSectionFormValues>({
    resolver: zodResolver(aboutEleganceSectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateAboutPageSectionAction("eleganceSection", values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t("admin.page.about.section.eleganceSection")}>
          <div className="space-y-5">
            <LocalizedField
              name="title"
              label={t("admin.page.field.title")}
              required
            />
            <LocalizedListField
              name="paragraphs"
              label={t("admin.page.field.paragraphs")}
              hint={t("admin.page.field.paragraphsHint")}
              textarea
              rows={4}
              addLabel={t("admin.crud.add")}
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}