"use client";

/**
 * The video section form (Pass D.1) — the `video` row
 * components/home/VideoSection.tsx reads.
 *
 * One field, on purpose: the section's placeholder copy is a dictionary string
 * and its layout, scroll-triggered loading and play/pause behaviour are not
 * content. The video is the only thing an operator would want to change without
 * editing source, so it is the only thing this form exposes.
 *
 * Empty means "no video", and the section is then hidden: the stock fallback
 * asset was deleted by the operator (Pass D.1 follow-up), so clearing the field
 * cannot restore a shipped film.
 * field is a supported way back to the shipped asset.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { SwitchField } from "@/components/admin/catalog/fields/ScalarFields";
import { MediaField } from "@/components/admin/MediaField";
import { SectionFormActions } from "@/components/admin/catalog/page-sections/SectionFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { updateVideoFeatureAction } from "@/lib/admin/actions/homepage";
import {
  videoFeatureFormSchema,
  type VideoFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { VideoFeatureWriteInput } from "@/lib/repositories/homepage-features";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

export function VideoFeatureForm({
  detail,
}: {
  /** The saved slot, or null when the row does not exist yet. */
  detail: VideoFeatureWriteInput | null;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues, notifyInvalid } = useCrudSubmit();

  const form = useForm<VideoFeatureFormValues>({
    resolver: zodResolver(videoFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      videoUrl: detail?.videoUrl ?? "",
      posterUrl: detail?.posterUrl ?? "",
    },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      const result = await run(() => updateVideoFeatureAction(values), {
        successMessage: t("admin.table.saved"),
      });
      if (result && !result.ok) applyFieldIssues(form, result);
    },
    // A blocked submit must SAY so — see useCrudSubmit#notifyInvalid.
    notifyInvalid,
  );

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
          title={t("admin.homepage.card.videoMedia")}
          description={t("admin.homepage.card.videoMediaHint")}
        >
          <div className="space-y-5">
            <MediaField
              name="videoUrl"
              kind="video"
              folder="homepage"
              label={t("admin.homepage.field.videoUrl")}
              hint={t("admin.homepage.field.videoUrlHint")}
            />
            {/*
              The poster is a PRELOADER: it is the frame painted while the
              video buffers. It sits directly under the video it belongs to,
              exactly as it does on the hero, so the two fields read as one
              pair rather than as unrelated settings.
            */}
            <MediaField
              name="posterUrl"
              kind="image"
              folder="homepage"
              label={t("admin.homepage.field.videoPoster")}
              hint={t("admin.homepage.field.videoPosterHint")}
            />
          </div>
        </FormCard>
      </FormProvider>
      <SectionFormActions pending={pending} />
    </form>
  );
}
