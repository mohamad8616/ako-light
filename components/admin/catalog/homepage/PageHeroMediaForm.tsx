"use client";

import { FormCard } from "@/components/admin/catalog/fields/form";
import { HomepageFormActions } from "@/components/admin/catalog/homepage/HomepageFormParts";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { MediaField } from "@/components/admin/MediaField";
import { updatePageHeroMediaAction } from "@/lib/admin/actions/homepage";
import { clearableMediaRefSchema } from "@/lib/admin/schemas/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { PageHeroMediaWriteInput } from "@/lib/repositories/homepage-features/hero";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

export function PageHeroMediaForm({
  page,
  detail,
}: {
  page: "about" | "s34";
  detail: PageHeroMediaWriteInput;
}) {
  const { t } = useLanguage();
  const { run, pending } = useCrudSubmit();
  const form = useForm<{ videoUrl: string }>({
    resolver: zodResolver(z.object({ videoUrl: clearableMediaRefSchema })),
    values: { videoUrl: detail.videoUrl ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await run(() => updatePageHeroMediaAction(page, values), {
      successMessage: t("admin.table.saved"),
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormProvider {...form}>
        <FormCard title={t("admin.homepage.card.heroMedia")}>
          <MediaField
            name="videoUrl"
            kind="video"
            folder={page}
            label={t("admin.homepage.field.heroVideo")}
            optional
          />
        </FormCard>
      </FormProvider>
      <HomepageFormActions pending={pending} />
    </form>
  );
}
