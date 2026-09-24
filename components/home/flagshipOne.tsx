"use client";

import { pick } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResolvedFlagshipOneFeature } from "@/lib/repositories/homepage-features";
import PlusTextBtn from "../ui/PlusTextBtn";
import SplitBanner from "./SplitBanner";

interface FlagshipOneProps {
  /**
   * Server-resolved slot data (`getFlagshipOneFeature()`); `null` renders
   * nothing, exactly like a slot saved with `enabled: false`.
   */
  data: ResolvedFlagshipOneFeature | null;
}

export default function FlagshipOne({ data }: FlagshipOneProps) {
  const { t, lang } = useLanguage();

  if (!data || !data.enabled) return null;

  // Copy is stored per language (Localized); the CTA label and the section
  // label are UI strings and stay in the translation dictionary.
  const title = pick(data.title, lang);

  return (
    <SplitBanner
      image={data.image}
      imageAlt={title}
      kicker={pick(data.kicker, lang)}
      title={title}
      page={t("paris.page")}
      paragraphs={data.paragraphs.map((paragraph) => pick(paragraph, lang))}
      cta={
        <PlusTextBtn
          href={data.ctaHref}
          text={t("paris.discover")}
          textColor="text-background"
        />
      }
    />
  );
}

