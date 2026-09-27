import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AboutBrandStorySectionForm,
  AboutEleganceSectionForm,
  AboutHeroSectionForm,
  AboutSubtitleSectionForm,
} from "@/components/admin/catalog/page-sections/AboutSectionForms";
import { isLocale } from "@/lib/i18n/routing";
import { getAboutPageContent } from "@/lib/repositories/about-page";
import { notFound } from "next/navigation";

/**
 * The /about content editor (myPlan.md Part D).
 *
 * One form per `AboutPageSection` row — the four sections the public page
 * renders, in render order. Content comes from the SAME read the public page
 * uses (`getAboutPageContent`), so the admin sees exactly what the site shows;
 * a section whose row is missing prefills with the seeded default and is
 * created by the action's upsert on first save.
 *
 * Access to every route below (admin) is gated by the layout's
 * requireAdminAccess(); each action re-authorizes on its own.
 */
export default async function AboutAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const content = await getAboutPageContent();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.about"
          descriptionKey="admin.section.about.description"
        />
        <AboutHeroSectionForm content={content.hero} />
        <AboutSubtitleSectionForm content={content.subtitle} />
        <AboutBrandStorySectionForm content={content.brandStory} />
        <AboutEleganceSectionForm content={content.elegance} />
      </div>
    </div>
  );
}