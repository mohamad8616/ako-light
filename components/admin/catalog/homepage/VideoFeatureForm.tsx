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
 * Empty means "keep the built-in `/videos/afterhenge.mp4`", so clearing the
 * field is a supported way back to the shipped asset.
 */
import { FormCard } from "@/components/admin/catalog/fields/form";
import { SwitchField } from "@/components/admin/catalog/fields/ScalarFields";
import { MediaField } from "@/components/admin/MediaField";
import { HomepageFormActions } from "@/components/admin/catalog/homepage/HomepageFormParts";
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
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<VideoFeatureFormValues>({
    resolver: zodResolver(videoFeatureFormSchema),
    values: {
      enabled: detail?.enabled ?? true,
      videoUrl: detail?.videoUrl ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateVideoFeatureAction(values), {
      successMessage: t("admin.table.saved"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard
          title={t("admin.homepage.card.videoMedia")}
          description={t("admin.homepage.card.videoMediaHint")}
        >
          <div className="space-y-5">
            <SwitchField
              name="enabled"
              label={t("admin.homepage.field.enabled")}
              description={t("admin.homepage.field.enabledHint")}
            />
            <MediaField
              name="videoUrl"
              kind="video"
              folder="homepage"
              label={t("admin.homepage.field.videoUrl")}
              hint={t("admin.homepage.field.videoUrlHint")}
            />
          </div>
        </FormCard>
      </FormProvider>
      <HomepageFormActions pending={pending} />
    </form>
  );
}
