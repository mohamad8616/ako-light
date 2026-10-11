"use client";

/**
 * The hero form (Pass D.1) — the `hero` row components/home/HeroSection.tsx
 * reads.
 *
 * The hero owns its content outright: no entity FK, no reference/override mode,
 * and — unlike every other slot — no required field. Each input OVERRIDES
 * something the component already renders from source: the video and poster
 * assets under /public, the `hero.*` dictionary copy, and the component's own
 * `/catalogue` button destination. So an empty field is not an error state, it
 * is "keep the built-in", which is why they are all optional and why the page
 * renders identically until an operator deliberately changes something.
 *
 * The video field is the SAME media field the image slots use, in its `video`
 * flavour: one upload path, one picker, one preview implementation.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { LocalizedField } from "@/components/admin/catalog/fields/LocalizedField";
import { SwitchField, TextField } from "@/components/admin/catalog/fields/ScalarFields";
import { MediaField } from "@/components/admin/MediaField";
import { HomepageFormActions } from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateHeroFeatureAction } from "@/lib/admin/actions/homepage";
import {
  heroFeatureFormSchema,
  type HeroFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { loc } from "@/lib/i18n/localized";
import type { HeroFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

export function HeroFeatureForm({
  detail,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: HeroFeatureWriteInput | null;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<HeroFeatureFormValues>({
    resolver: zodResolver(heroFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      videoUrl: detail?.videoUrl ?? "",
      posterUrl: detail?.posterUrl ?? "",
      firstLine: detail?.firstLine ?? loc("", ""),
      secondLine: detail?.secondLine ?? loc("", ""),
      ctaLabel: detail?.ctaLabel ?? loc("", ""),
      ctaHref: detail?.ctaHref ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateHeroFeatureAction(values), {
      successMessage: t("admin.table.saved"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.content")}>
          <SwitchField
            name="enabled"
            label={t("admin.homepage.field.enabled")}
            description={t("admin.homepage.field.enabledHint")}
          />
        </FormCard>

        <FormCard
          title={t("admin.homepage.card.heroMedia")}
          description={t("admin.homepage.card.heroMediaHint")}
        >
          <div className="space-y-5">
            <MediaField
              name="videoUrl"
              kind="video"
              folder="homepage"
              label={t("admin.homepage.field.heroVideo")}
              hint={t("admin.homepage.field.heroVideoHint")}
            />
            <MediaField
              name="posterUrl"
              kind="image"
              folder="homepage"
              label={t("admin.homepage.field.heroPoster")}
              hint={t("admin.homepage.field.heroPosterHint")}
            />
          </div>
        </FormCard>

        <FormCard
          title={t("admin.homepage.card.heroCopy")}
          description={t("admin.homepage.card.heroCopyHint")}
        >
          <div className="space-y-5">
            <LocalizedField
              name="firstLine"
              label={t("admin.homepage.field.firstLine")}
              hint={t("admin.homepage.field.heroLineHint")}
              optional
            />
            <LocalizedField
              name="secondLine"
              label={t("admin.homepage.field.secondLine")}
              hint={t("admin.homepage.field.heroLineHint")}
              optional
            />
          </div>
        </FormCard>

        <FormCard
          title={t("admin.homepage.card.heroCta")}
          description={t("admin.homepage.card.heroCtaHint")}
        >
          <div className="space-y-5">
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
              placeholder="/catalogue  ·  https://example.com"
            />
          </div>
        </FormCard>
      </FormProvider>
      <HomepageFormActions pending={pending} />
    </form>
  );
}
