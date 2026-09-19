"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PlusTextBtn from "../ui/PlusTextBtn";
import SplitBanner from "./SplitBanner";

export default function HengeParisBanner() {
  const { t } = useLanguage();
  const { paris } = homepageSections;
  
  return (
    <SplitBanner
      image={paris.image}
      imageAlt={t("paris.title")}
      kicker={t("paris.kicker")}
      title={t("paris.title")}
      page={t("paris.page")}
      paragraphs={[
        t("paris.p1"),
        t("paris.p2"),
      ]}
      cta={
        <PlusTextBtn
          href="/hlife/henge-paris"
          text={t("paris.discover")}
          textColor="text-background"
        />
      }

    />
  );
}
