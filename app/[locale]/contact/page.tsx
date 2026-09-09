import ContactHero from "@/components/contact/ContactHero";
import ContactInfoSection from "@/components/contact/ContactInfoSection";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translations[resolveLocale(locale)];

  return buildLocalizedMetadata({
    locale,
    path: "/contact",
    title: t["page.contact.title"],
    description: t["page.contact.description"],
  });
}

export default function ContactPage() {
  return (
    <main className="min-h-screen space-y-32 bg-stone-950 py-32 md:py-52">
      <ContactInfoSection />
      <ContactHero />
    </main>
  );
}
