"use client";

import { useState, type FormEvent } from "react";
import FormField from "@/components/contact/FormField";
import FormTextarea from "@/components/contact/FormTextarea";
import ConsentCheckbox from "@/components/contact/ConsentCheckbox";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export default function FlagshipContactSection() {
  const { t, lang } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Wire this up to your real email/API endpoint — same note as the
    // main /contact page's form.
    setStatus("submitting");
    setTimeout(() => setStatus("sent"), 600);
  }

  return (
    // id target for FloatingRequestInfoButton's scroll-to behavior
    <section
      id="contact-form"
      className="bg-stone-950 px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-[8.5vw]"
    >
      <h2
        className={cn(
          "text-2xl font-bold tracking-tight text-white uppercase md:text-3xl",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("flagship.contactHeading")}
      </h2>
      <div className="mt-4 h-px w-full bg-white/20" />

      <p
        className={cn(
          "mt-6 max-w-xl text-sm text-stone-400",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("flagship.contactIntro")}
      </p>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <FormField label={t("form.fullName")} required name="fullName" value={fullName} onChange={setFullName} />
          <FormField label={t("form.email")} required type="email" name="email" value={email} onChange={setEmail} />
          <FormField label={t("form.phone")} type="tel" name="phone" value={phone} onChange={setPhone} />
        </div>

        <FormTextarea label={t("form.message")} name="message" value={message} onChange={setMessage} />

        <div className="flex flex-col gap-5">
          <ConsentCheckbox checked={newsletterConsent} onChange={setNewsletterConsent}>
            {t("flagship.consentNewsletter")}
          </ConsentCheckbox>

          <ConsentCheckbox checked={privacyConsent} onChange={setPrivacyConsent} underline required>
            {t("flagship.consentPrivacy")}
          </ConsentCheckbox>
        </div>

        <button
          type="submit"
          disabled={status !== "idle"}
          className={cn(
            "w-fit cursor-pointer rounded-full bg-white px-8 py-3 text-xs font-medium tracking-tighter text-stone-950 uppercase transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {status === "sent" ? t("flagship.sent") : t("flagship.send")}
        </button>
      </form>
    </section>
  );
}
