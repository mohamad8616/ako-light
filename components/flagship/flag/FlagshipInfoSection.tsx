"use client";

import Link from "next/link";
import type { FlagshipWithDetail } from "@/lib/data/flagships";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

export default function FlagshipInfoSection({ flagship }: { flagship: FlagshipWithDetail }) {
  const { t, lang } = useLanguage();
  const name = pick(flagship.name, lang);
  return (
    <section className="bg-stone-100 px-6 py-16 md:px-12 md:py-20 lg:px-20 xl:px-[8.5vw]">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div>
          <nav
            className={cn(
              "flex items-center gap-2 text-xs font-medium tracking-tighter text-stone-500 uppercase",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            <Link
              href="/flagship"
              className="underline underline-offset-2 transition-colors hover:text-stone-950"
            >
              {t("flagship.breadcrumb")}
            </Link>
            <span>/</span>
            <span className="text-stone-950">{name}</span>
          </nav>

          <h2
            className={cn(
              "mt-6 text-2xl font-medium text-stone-950 md:text-3xl",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {pick(flagship.heading, lang)}
          </h2>

          <p
            className={cn(
              "mt-6 max-w-2xl text-sm leading-relaxed text-stone-600",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {pick(flagship.description, lang)}
          </p>
        </div>

        <div>
          <span
            className={cn(
              "text-xs font-medium tracking-tighter text-stone-500 uppercase",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {t("flagship.infoLabel")}
          </span>

          <p
            className={cn(
              "mt-6 text-base text-stone-950",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {pick(flagship.info.name, lang)}
          </p>

          <div
            className={cn(
              "mt-6 flex flex-col text-sm text-stone-700",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {flagship.info.addressLines.map((line, i) => (
              <span key={i}>{pick(line, lang)}</span>
            ))}
          </div>

          <div
            className={cn(
              "mt-6 flex flex-col gap-3 text-sm text-stone-700",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {flagship.info.hours.map((h, i) => (
              <span key={i} className="flex flex-col">
                <span>{pick(h.label, lang)}</span>
                <span>{h.value}</span>
              </span>
            ))}
          </div>

          <div
            className={cn(
              "mt-6 flex flex-col text-sm text-stone-700",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            <span>{pick(flagship.info.appointmentNote, lang)}</span>
            <a
              href={`tel:${flagship.info.phone.replace(/\s+/g, "")}`}
              className="text-stone-950 transition-colors hover:underline"
            >
              {flagship.info.phone}
            </a>
            <a
              href={`mailto:${flagship.info.email}`}
              className="text-stone-950 underline underline-offset-2"
            >
              {flagship.info.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
