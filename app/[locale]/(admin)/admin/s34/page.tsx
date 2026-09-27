import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  S34HeroSectionForm,
  S34KickerSectionForm,
} from "@/components/admin/catalog/page-sections/S34SectionForms";
import { isLocale } from "@/lib/i18n/routing";
import { getS34PageContent } from "@/lib/repositories/s34-page";
import { notFound } from "next/navigation";

/**
 * The /s34 content editor (myPlan.md Part D).
 *
 * One form per `S34PageSection` row — the four sections the public page renders,
 * in render order. Content comes from the SAME read the public page uses
 * (`getS34PageContent`), so the admin sees exactly what the site shows; a
 * section whose row is missing prefills with the seeded default and is created
 * by the action's upsert on first save. Gallery photos are deliberately absent:
 * they are not translation content and stay in lib/data/s34.ts.
 *
 * Access to every route below (admin) is gated by the layout's
 * requireAdminAccess(); each action re-authorizes on its own.
 */
export default async function S34AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const content = await getS34PageContent();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.s34"
          descriptionKey="admin.section.s34.description"
        />
        <S34HeroSectionForm content={content.hero} />
        <S34KickerSectionForm
          sectionKey="conceptSection"
          content={content.concept}
        />
        <S34KickerSectionForm
          sectionKey="gallerySection"
          content={content.gallery}
        />
        <S34KickerSectionForm
          sectionKey="harmonySection"
          content={content.harmony}
        />
      </div>
    </div>
  );
}