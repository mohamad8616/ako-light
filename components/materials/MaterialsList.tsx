"use client";

import HomepageSection from "@/utility/HomepageSection";
import { materials } from "../../lib/data/materials";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import Row from "../ui/Row";

export const ROWS_ON_LOAD = 2;

export default function MaterialsList() {
  const { lang } = useLanguage();
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {materials.map((material, i) => (
          <Row
            route="materials"
            key={material.id}
            index={i}
            animateOnLoad={i < ROWS_ON_LOAD}
            slug={material.id}
            name={pick(material.name, lang)}
            image={material.image}
            width={"40"}
          />
        ))}
      </div>
    </HomepageSection>
  );
}
