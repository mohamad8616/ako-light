"use client";

import { useState, type FormEvent } from "react";
import FormField from "./FormField";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";
import ConsentCheckbox from "./ConsentCheckbox";
import { subjectOptions } from "@/lib/data/contact";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

export default function ContactForm() {
  const { t, lang } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(subjectOptions[0].value);
  const [message, setMessage] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  const selectOptions = subjectOptions.map((option) => ({
    value: option.value,
    label: pick(option.label, lang),
  }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Nothing is wired to a real backend here \u2014 plug in your actual
    // email/API endpoint (e.g. fetch("/api/contact", { method: "POST",
    // body: JSON.stringify({ fullName, email, phone, subject, message,
    // newsletterConsent }) })) in place of this simulated delay.
    setStatus("submitting");
    setTimeout(() => setStatus("sent"), 600);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-16 flex flex-col gap-10 md:mt-20">
      <FormField label={t("form.fullName")} required name="fullName" value={fullName} onChange={setFullName} />
      <FormField label={t("form.email")} required type="email" name="email" value={email} onChange={setEmail} />
      <FormField label={t("form.phone")} type="tel" name="phone" value={phone} onChange={setPhone} />
      <FormSelect
        label={t("form.subject")}
        name="subject"
        value={subject}
        options={selectOptions}
        onChange={setSubject}
      />
      <FormTextarea label={t("form.message")} name="message" value={message} onChange={setMessage} />

      <div className="flex flex-col gap-5">
        <ConsentCheckbox checked={newsletterConsent} onChange={setNewsletterConsent}>
          {t("form.consentNewsletter")}
        </ConsentCheckbox>

        <ConsentCheckbox
          checked={privacyConsent}
          onChange={setPrivacyConsent}
          underline
          required
        >
          {t("form.consentPrivacy")}
        </ConsentCheckbox>
      </div>

      <button
        type="submit"
        disabled={status !== "idle"}
        className={cn(
          "w-fit cursor-pointer rounded-full border border-white/20 bg-stone-900 px-8 py-3 text-xs font-normal tracking-tighter text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {status === "sent" ? t("contact.sent") : t("contact.send")}
      </button>
    </form>
  );
}
