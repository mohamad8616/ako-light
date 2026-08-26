import ContactHero from "@/components/contact/ContactHero";
import ContactInfoSection from "@/components/contact/ContactInfoSection";

export const metadata = {
  title: "Contact | Henge",
  description:
    "Get in touch with Henge — showroom, press office, and headquarters contact details.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen space-y-32 bg-stone-950 py-32 md:py-52">
      <ContactInfoSection />
      <ContactHero />
    </main>
  );
}
