"use client";

import { useState, type FormEvent } from "react";
import FormField from "./FormField";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";
import ConsentCheckbox from "./ConsentCheckbox";
import { subjectOptions } from "@/lib/data/contact";

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(subjectOptions[0]);
  const [message, setMessage] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

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
      <FormField label="Full Name" required name="fullName" value={fullName} onChange={setFullName} />
      <FormField label="Email" required type="email" name="email" value={email} onChange={setEmail} />
      <FormField label="Phone" type="tel" name="phone" value={phone} onChange={setPhone} />
      <FormSelect
        label="Subject of the communication"
        name="subject"
        value={subject}
        options={subjectOptions}
        onChange={setSubject}
      />
      <FormTextarea label="Message" name="message" value={message} onChange={setMessage} />

      <div className="flex flex-col gap-5">
        <ConsentCheckbox checked={newsletterConsent} onChange={setNewsletterConsent}>
          I declare that I have read the privacy policy and consent to the
          processing of my personal data. After reading the above privacy
          policy I declare that I wish to proceed with registering for the
          free newsletter service.
        </ConsentCheckbox>

        <ConsentCheckbox
          checked={privacyConsent}
          onChange={setPrivacyConsent}
          underline
          required
        >
          I have read and agree to the privacy policy, and I consent to the
          processing of the personal data provided in this contact form in
          accordance with the purposes and methods specified.
        </ConsentCheckbox>
      </div>

      <button
        type="submit"
        disabled={status !== "idle"}
        className="font-din w-fit cursor-pointer rounded-full border border-white/20 bg-stone-900 px-8 py-3 text-xs font-normal tracking-tighter text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sent" ? "Request sent" : "Send the request"}
      </button>
    </form>
  );
}
