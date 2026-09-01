"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
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
        <Paragraph key="p1">{t("paris.p1")}</Paragraph>,
        <Paragraph key="p2">{t("paris.p2")}</Paragraph>,
      ]}
      cta={
        <PlusTextBtn
          href="/hlife/henge-paris"
          text={t("paris.discover")}
          textColor="text-background"
        />
      }
      badge={
        <div className="bg-background absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full text-white">
          <span className="text-[10px] font-light">H</span>
        </div>
      }
    />
  );
}
