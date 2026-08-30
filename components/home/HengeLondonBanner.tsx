"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Paragraph } from "@/utility/Paragraph";
import PlusTextBtn from "../ui/PlusTextBtn";
import SplitBanner from "./SplitBanner";

export default function HengeLondonBanner() {
  const { t } = useLanguage();
  const { london } = homepageSections;

  return (
    <SplitBanner
      image={london.image}
      imageAlt={t("london.title")}
      kicker={t("london.kicker")}
      title={t("london.title")}
      paragraphs={[
        <Paragraph key="p1">{t("london.p1")}</Paragraph>,
        <Paragraph key="p2">{t("london.p2")}</Paragraph>,
      ]}
      cta={
        <PlusTextBtn
          href="/showroom/showroom-henge-london"
          text={t("london.discover")}
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
