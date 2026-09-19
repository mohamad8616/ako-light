import ContactHero from "@/components/contact/ContactHero";
import ContactInfoSection from "@/components/contact/ContactInfoSection";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import { absoluteUrl, webPageJsonLd } from "@/lib/seo/structuredData";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.contact.title"],
      t["page.contact.description"],
      absoluteUrl("/contact", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/contact",
    title: t["page.contact.title"],
    description: t["page.contact.description"],
    jsonLd: jsonLdData,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.contact.title"],
      t["page.contact.description"],
      absoluteUrl("/contact", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="min-h-screen space-y-32 bg-stone-950 py-32 md:py-52">
        <ContactInfoSection />
        <ContactHero />
      </main>
    </>
  );
}
