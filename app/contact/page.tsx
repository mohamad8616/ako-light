"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";

export default function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
  };

  return (
    <main className="w-full bg-background">
      <PageHeader title={t("contact.title")} subtitle={t("contact.subtitle")} />

      <section className="mx-auto max-w-[1600px] px-6 pb-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Info */}
          <Reveal>
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.3em] text-white/50">
                  Henge
                </h3>
                <p className="mt-3 text-base font-light leading-relaxed text-white/70">
                  {"Via dell'Artigianato 12"}
                  <br />
                  36030 Montecchio Precalcino (VI)
                  <br />
                  Italy
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.3em] text-white/50">
                  Email
                </h3>
                <p className="mt-3 text-base font-light text-white/70">
                  info@henge07.com
                </p>
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={0.15}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="mb-2 block text-sm font-light uppercase tracking-[0.2em] text-white/50">
                  {t("contact.name")}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border-b border-white/20 bg-transparent py-3 text-base font-light text-white outline-none transition-colors placeholder:text-white/30 focus:border-white"
                  placeholder={t("contact.name")}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-light uppercase tracking-[0.2em] text-white/50">
                  {t("contact.email")}
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border-b border-white/20 bg-transparent py-3 text-base font-light text-white outline-none transition-colors placeholder:text-white/30 focus:border-white"
                  placeholder={t("contact.email")}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-light uppercase tracking-[0.2em] text-white/50">
                  {t("contact.message")}
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full resize-none border-b border-white/20 bg-transparent py-3 text-base font-light text-white outline-none transition-colors placeholder:text-white/30 focus:border-white"
                  placeholder={t("contact.message")}
                />
              </div>

              <button
                type="submit"
                className="group inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-white/70"
              >
                <span>{t("contact.send")}</span>
                <span className="inline-block text-xl transition-transform duration-300 group-hover:rotate-90">
                  +
                </span>
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </main>
  );
}