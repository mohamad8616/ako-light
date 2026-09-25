import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HomepageFeaturesGrid } from "@/components/admin/catalog/homepage/HomepageFeaturesGrid";
import { isLocale } from "@/lib/i18n/routing";
import { getHomepageFeaturesOverview } from "@/lib/repositories/homepage-features";
import { notFound } from "next/navigation";

/**
 * The homepage hub — the five feature slots the public home page renders, each
 * as a summary card linking to its dedicated edit view.
 *
 * Server component on purpose: the slot summaries are read once per request and
 * passed down as plain, serializable DTOs. The grid itself is a server component
 * too, so the page has no client boundary of its own until a form is opened.
 */
export default async function HomepageAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const rows = await getHomepageFeaturesOverview();

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.homepage"
          descriptionKey="admin.section.homepage.description"
        />
        <HomepageFeaturesGrid rows={rows} locale={locale} />
      </div>
    </div>
  );
}
