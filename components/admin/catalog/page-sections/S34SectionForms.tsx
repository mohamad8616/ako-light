"use client";

/**
 * The S34-page section forms (myPlan.md Part D) — one per `S34PageSection` row.
 *
 * Two shapes only: the hero (title + subtitle) and the shared
 * kicker-over-paragraphs shape that concept, gallery and harmony all use, so the
 * kicker form takes the section key and renders the right card title from it.
 * Each form is independent (own react-hook-form + save button) because the
 * sections are independent rows.
 *
 * `content` arrives from the page (getS34PageContent), so the admin edits
 * exactly what the site renders; the server action re-validates the same shape
 * before the repository upsert. Photos are NOT here — they stay in
 * lib/data/s34.ts and the section components (not translation content).
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import {
  LocalizedField,
  LocalizedListField,
} from "@/components/admin/catalog/fields/LocalizedField";
import { SectionFormActions } from "@/components/admin/catalog/page-sections/SectionFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateS34PageSectionAction } from "@/lib/admin/actions/s34";
import {
  s34HeroSectionSchema,
  s34KickerSectionSchema,
  type S34HeroSectionFormValues,
  type S34KickerSectionFormValues,
} from "@/lib/admin/schemas/s34";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type {
  S34HeroContent,
  S34KickerSectionContent,
  S34KickerSectionKey,
} from "@/lib/repositories/s34-page";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/** components/s34/S34Hero.tsx — `s34.hero.title` / `.subtitle`. */
export function S34HeroSectionForm({ content }: { content: S34HeroContent }) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<S34HeroSectionFormValues>({
    resolver: zodResolver(s34HeroSectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateS34PageSectionAction("heroSection", values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t("admin.page.s34.section.heroSection")}>
          <div className="space-y-5">
            <LocalizedField
              name="title"
              label={t("admin.page.field.title")}
              required
            />
            <LocalizedField
              name="subtitle"
              label={t("admin.page.field.subtitle")}
              required
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}

/**
 * The concept / gallery / harmony sections: a kicker heading over a repeatable
 * paragraph list. `sectionKey` picks the row to save and the card's title.
 */
export function S34KickerSectionForm({
  sectionKey,
  content,
}: {
  /** One of the three kicker sections — the hero has its own shape. */
  sectionKey: S34KickerSectionKey;
  content: S34KickerSectionContent;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();
  const form = useForm<S34KickerSectionFormValues>({
    resolver: zodResolver(s34KickerSectionSchema),
    values: content,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(
      () => updateS34PageSectionAction(sectionKey, values),
      { successMessage: t("admin.table.saved") },
    );
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormProvider {...form}>
        <FormCard title={t(`admin.page.s34.section.${sectionKey}`)}>
          <div className="space-y-5">
            <LocalizedField
              name="kicker"
              label={t("admin.page.field.kicker")}
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