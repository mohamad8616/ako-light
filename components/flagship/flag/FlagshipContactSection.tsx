"use client";

import { useState, type FormEvent } from "react";
import FormField from "@/components/contact/FormField";
import FormTextarea from "@/components/contact/FormTextarea";
import ConsentCheckbox from "@/components/contact/ConsentCheckbox";

export default function FlagshipContactSection() {
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
      <h2 className="font-din text-2xl font-bold tracking-tight text-white uppercase md:text-3xl">
        Send us a message
      </h2>
      <div className="mt-4 h-px w-full bg-white/20" />

      <p className="font-din mt-6 max-w-xl text-sm text-stone-400">
        For any inquiries or appointments regarding our products, please
        fill out the form below.
      </p>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <FormField label="Full Name" required name="fullName" value={fullName} onChange={setFullName} />
          <FormField label="Email" required type="email" name="email" value={email} onChange={setEmail} />
          <FormField label="Phone" type="tel" name="phone" value={phone} onChange={setPhone} />
        </div>

        <FormTextarea label="Message" name="message" value={message} onChange={setMessage} />

        <div className="flex flex-col gap-5">
          <ConsentCheckbox checked={newsletterConsent} onChange={setNewsletterConsent}>
            I declare that I have read the privacy policy and consent to
            the processing of my personal data. After reading the above
            privacy policy I declare that I wish to proceed with
            registering for the free newsletter service.
          </ConsentCheckbox>

          <ConsentCheckbox checked={privacyConsent} onChange={setPrivacyConsent} underline required>
            I have read and agree to the privacy policy, and I consent to
            the processing of the personal data provided in this contact
            form in accordance with the purposes and methods specified.
          </ConsentCheckbox>
        </div>

        <button
          type="submit"
          disabled={status !== "idle"}
          className="font-din w-fit cursor-pointer rounded-full bg-white px-8 py-3 text-xs font-medium tracking-tighter text-stone-950 uppercase transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sent" ? "Sent" : "Send"}
        </button>
      </form>
    </section>
  );
}
