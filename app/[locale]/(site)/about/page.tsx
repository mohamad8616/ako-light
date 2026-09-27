import AboutHero from "@/components/about/AboutHero";
import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ProjectsSections from "@/components/ProjectsSections";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import { getAboutGalleryImages } from "@/lib/data/about";
import { getAboutPageContent } from "@/lib/repositories/about-page";
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
      t["page.about.title"],
      t["page.about.description"],
      absoluteUrl("/about", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/about",
    title: t["page.about.title"],
    description: t["page.about.description"],
    jsonLd: jsonLdData,
  });
}
const images = getAboutGalleryImages();
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  // myPlan.md Part C — section copy now comes from AboutPageSection rows
  // (seeded from the former translation keys, admin-editable); `t` above is
  // kept for the SEO/JSON-LD metadata only, which is page chrome.
  const content = await getAboutPageContent();

  const jsonLdData = [
    webPageJsonLd(
      t["page.about.title"],
      t["page.about.description"],
      absoluteUrl("/about", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="bg-background-secondary w-full space-y-5 sm:space-y-10 md:space-y-12 lg:space-y-14">
        <AboutHero content={content.hero} />
        <AboutHeroVideo content={content.subtitle} />
        <BrandStory content={content.brandStory} />
        <ImageGalleryCarousel
          circle={true}
          multiWidth={true}
          mobileColumn={true}
          images={images}
        />
        <EleganceSection content={content.elegance} />
        <ProjectsSections />
      </main>
    </>
  );
}
