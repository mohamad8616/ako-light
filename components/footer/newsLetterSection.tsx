"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function NewsletterSection() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  return (
    <section className="bg-background-secondary h-screen flex px-6 py-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <div className="mx-auto grid max-w-[1600px] items-center gap-16 lg:grid-cols-[0.9fr_1fr] lg:gap-24">
        {/* Left */}
        <div>
          <h2 className="max-w-100 font-[Arial_Narrow,sans-serif] text-[40px] font-normal uppercase leading-[0.98] tracking-[-1.5px] text-background md:text-[46px] lg:text-[50px]">
            {t("newsletter.title1")}
            <br />
            {t("newsletter.title2")}
          </h2>

          <p className="mt-9 max-w-162.5 text-[16px] font-light leading-relaxed tracking-[0.3px] text-slate-600 md:text-[18px]">
            {t("newsletter.description")}
          </p>
        </div>

        {/* Right */}
        <div className="w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!agreed || !email) return;
              // Handle newsletter subscription here
            }}
          >
            {/* Email */}
            <div className="flex h-20 w-full items-center rounded-full bg-background-secondary p-1.5 pl-10 shadow-none">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("newsletter.emailPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-[18px] font-light tracking-wide text-[#555] outline-none placeholder:text-[#8d8d8d]"
              />

              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-17 w-17 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition-transform duration-300 hover:scale-[1.04]"
              >
                <ArrowRight
                  size={25}
                  strokeWidth={1.8}
                  className="translate-x-px rtl:rotate-180"
                />
              </button>
            </div>

            {/* Terms */}
            <label className="mt-10 flex cursor-pointer items-center gap-5 text-[13px] uppercase tracking-[0.4px] text-[#858585]">
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white transition-all duration-200">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="h-2 w-2 scale-0 rounded-full bg-[#111] transition-transform duration-200 peer-checked:scale-100" />
              </span>

              <span>
                {t("newsletter.agree")}{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-[3px] transition-colors hover:text-[#111]"
                >
                  {t("newsletter.terms")}
                </Link>
              </span>
            </label>
          </form>
        </div>
      </div>
    </section>
  );
}