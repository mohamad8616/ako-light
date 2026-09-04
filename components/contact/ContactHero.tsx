"use client";

import HomepageSection from "@/utility/HomepageSection";
import ContactForm from "./ContactForm";
import { contactHero } from "@/lib/data/contact";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function ContactHero() {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="grid grid-cols-1 bg-stone-950 lg:grid-cols-2">
      {/* Image \u2014 hidden below lg, matching the "photo will be hidden on
          small screens" requirement. Height comes from the grid row
          stretching to match the form column's height. */}
      <div className="relative hidden lg:block">
        <Image
          src={contactHero.heroImage}
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-16 lg:py-32 xl:px-20">
        <h1
          className={cn(
            "text-4xl font-bold tracking-tight text-white uppercase md:text-5xl",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {pick(contactHero.title, lang)}
        </h1>
        <p
          className={cn(
            "mt-6 max-w-md text-sm font-normal tracking-tight text-stone-400",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {pick(contactHero.description, lang)}
        </p>

        <ContactForm />
      </div>
    </HomepageSection>
  );
}
