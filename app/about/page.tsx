"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="w-full bg-background">
      <PageHeader title={t("about.title")} subtitle={t("about.subtitle")} />

      <section className="mx-auto max-w-[1600px] px-6 pb-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
          <Reveal>
            <p className="text-lg font-light leading-relaxed text-white/70 md:text-xl">
              {t("about.p1")}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-lg font-light leading-relaxed text-white/70 md:text-xl">
              {t("about.p2")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <div className="mt-20 aspect-[16/9] w-full overflow-hidden">
            <img
              src="https://www.henge07.com/app/uploads/2026/04/hero-mdw2026.jpg"
              alt={t("about.title")}
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </section>
    </main>
  );
}