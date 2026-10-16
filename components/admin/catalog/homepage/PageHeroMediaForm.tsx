"use client";

import { FormCard } from "@/components/admin/catalog/fields/form";
import { SectionFormActions } from "@/components/admin/catalog/page-sections/SectionFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { MediaField } from "@/components/admin/MediaField";
import { updatePageHeroMediaAction } from "@/lib/admin/actions/homepage";
import { clearableMediaRefSchema } from "@/lib/admin/schemas/common";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { PageHeroMediaWriteInput } from "@/lib/repositories/homepage-features/hero";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

/** The same pair the homepage hero carries: a film and its preloader frame. */
const pageHeroMediaSchema = z.object({
  videoUrl: clearableMediaRefSchema,
  posterUrl: clearableMediaRefSchema,
});

export function PageHeroMediaForm({
  page,
  detail,
}: {
  page: "about" | "s34";
  detail: PageHeroMediaWriteInput;
}) {
  const { t } = useLanguage();
  const { run, pending, notifyInvalid } = useCrudSubmit();
  const form = useForm<{ videoUrl: string; posterUrl: string }>({
    resolver: zodResolver(pageHeroMediaSchema),
    values: {
      videoUrl: detail.videoUrl ?? "",
      posterUrl: detail.posterUrl ?? "",
    },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      await run(() => updatePageHeroMediaAction(page, values), {
        successMessage: t("admin.table.saved"),
      });
    },
    // A rejected submit must SAY so — see useCrudSubmit#notifyInvalid.
    notifyInvalid,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.heroMedia")}>
          <div className="space-y-5">
            <MediaField
              name="videoUrl"
              kind="video"
              folder={page}
              label={t("admin.homepage.field.heroVideo")}
              optional
            />
            {/*
              The poster is the frame painted while this page's hero video
              buffers. It sits directly under the video it belongs to, exactly
              as on the homepage hero and the homepage video section.
            */}
            <MediaField
              name="posterUrl"
              kind="image"
              folder={page}
              label={t("admin.homepage.field.heroPoster")}
              optional
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}
