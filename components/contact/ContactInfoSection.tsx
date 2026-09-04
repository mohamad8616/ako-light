"use client";

import HomepageSection from "@/utility/HomepageSection";
import { contactCards, contactInfoHeading } from "@/lib/data/contact";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

export default function ContactInfoSection() {
  const { t, lang } = useLanguage();
  return (
    <HomepageSection className="bg-stone-950 px-6 py-20 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <span
        className={cn(
          "text-xs font-normal tracking-tighter text-stone-500 uppercase",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("menu.contacts")}
      </span>
      <div className="mt-2 h-px w-full bg-white/15" />

      <h2
        className={cn(
          "mt-20 lg:mt-38 text-3xl font-bold tracking-tight text-white uppercase md:text-5xl ",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {pick(contactInfoHeading.line1, lang)}
        <br />
        {pick(contactInfoHeading.line2, lang)}
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {contactCards.map((card, cardIndex) => (
          <div key={cardIndex} className="bg-stone-900 p-8">
            <h3
              className={cn(
                "text-sm font-medium tracking-tighter text-white uppercase underline underline-offset-4",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {pick(card.title, lang)}
            </h3>

            <div
              className={cn(
                "mt-8 flex flex-col gap-1 text-sm text-stone-400",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {card.lines.map((line, i) => (
                <span key={i}>{pick(line, lang)}</span>
              ))}
              <span>
                {t("contact.emailLabel")}{" "}
                <a
                  href={`mailto:${card.email}`}
                  className="text-white transition-colors hover:text-stone-300"
                >
                  {card.email}
                </a>
              </span>
              <span>
                {t("contact.telLabel")}{" "}
                <a
                  href={`tel:${card.phone.replace(/\s+/g, "")}`}
                  className="text-white transition-colors hover:text-stone-300"
                >
                  {card.phone}
                </a>
              </span>
            </div>
          </div>
        ))}
      </div>
    </HomepageSection>
  );
}
