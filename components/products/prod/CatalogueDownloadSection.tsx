"use client";

import AnimatedDownloadCircle from "@/components/ui/AnimateDownloadCircle";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import { pick } from "@/lib/i18n/localized";
import type { SiteSettingsDto } from "@/lib/repositories/site-settings";
import downloadCatalogue from "@/public/photos/downloadCatalogue.jpg";
import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import SectionTitle from "@/utility/SectionTitle";
import { imageZoomClass } from "@/utility/animations";
import Image from "next/image";

export default function CatalogueDownloadSection({
  link,
  settings,
}: {
  link: string;
  /**
   * The editable catalogue block, read once by the admin-editable singleton
   * (SiteSettings). Null on a fresh database, and every FIELD inside is null
   * until an operator fills it in — so each piece below falls back individually
   * and the section renders exactly its old copy until edited.
   */
  settings: SiteSettingsDto | null;
}) {
  const { t, lang } = useLanguage();

  // DB-first per field: an admin value wins; the dictionary string is the
  // fallback. Matches how every other admin-editable section resolves.
  const title = pick(settings?.catalogueTitle ?? null, lang).trim();
  const body = pick(settings?.catalogueText ?? null, lang).trim();
  // The CTA label is editable at /admin/settings; a blank pair keeps the
  // dictionary label, so an un-edited site renders exactly what it always did.
  const ctaLabel =
    pick(settings?.catalogueCtaLabel ?? null, lang).trim() ||
    t("products.catalogue.download");

  // The cover: the uploaded Media URL wins, else the bundled photo. The href
  // keeps its historical default (`#`) unless the operator set one.
  const cover = settings?.catalogueUrl ?? downloadCatalogue;
  const href = settings?.catalogueHref?.trim() || "#";

  return (
    <HomepageSection className="items-cente flex min-h-screen w-full px-6 py-20 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <div className="grid w-full grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center lg:gap-24">
        <div className="space-y-7 h-full">
          <SectionSubTitle className="tracking-tight mb-2">
            {t("products.catalogue.eyebrow")}
          </SectionSubTitle>
          <SectionTitle className="font-medium tracking-tighter">
            {title}
          </SectionTitle>

          <p
            className={`${lang === "fa" ? "font-noora tracking-tight" : "font-din"} text-background text-sm md:text-base`}
          >
            {body}
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:justify-self-end">
          {/* Catalogue cover photo — sized to match SplitBanner's photo
              (aspect-4/5 + fixed height on mobile, 3/4 column width on lg). */}
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label={t("products.catalogue.aria")}
            className="group relative mx-auto block aspect-4/5 h-125.75 max-h-125.75 w-full overflow-hidden lg:aspect-3/4 lg:w-3/4"
          >
            <Image
              src={cover}
              alt={t("products.catalogue.aria")}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className={imageZoomClass({ scale: 102 })}
            />

            {/* Download icon */}
            <AnimatedDownloadCircle />
          </Link>

          <PlusTextBtn
            href={link}
            text={ctaLabel}
            textColor="text-background"
          />
        </div>
      </div>
    </HomepageSection>
  );
}
