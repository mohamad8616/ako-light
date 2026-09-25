import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { CatalogueFeatureForm } from "@/components/admin/catalog/homepage/CatalogueFeatureForm";
import { FlagshipOneFeatureForm } from "@/components/admin/catalog/homepage/FlagshipOneFeatureForm";
import { HomeCollectionFeatureForm } from "@/components/admin/catalog/homepage/HomeCollectionFeatureForm";
import { ProjectBannerFeatureForm } from "@/components/admin/catalog/homepage/ProjectBannerFeatureForm";
import { ProjectDarkBackgroundFeatureForm } from "@/components/admin/catalog/homepage/ProjectDarkBackgroundFeatureForm";
import {
  HOMEPAGE_HREF,
  HOMEPAGE_SLOT_META,
  isHomepageSlot,
  type HomepageSlotKey,
} from "@/lib/admin/homepage";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getCatalogueItemAdminRows } from "@/lib/repositories/catalogue";
import { getFlagshipAdminRows } from "@/lib/repositories/flagships";
import {
  getCatalogueFeatureAdminDetail,
  getFlagshipOneFeatureAdminDetail,
  getHomeCollectionFeatureAdminDetail,
  getProjectBannerFeatureAdminDetail,
  getProjectDarkBackgroundFeatureAdminDetail,
} from "@/lib/repositories/homepage-features";
import { getProjectAdminRows } from "@/lib/repositories/projects";
import { notFound } from "next/navigation";

/**
 * The per-slot edit view — one page for all five homepage banners, addressed by
 * the slot key (`/admin/homepage/flagship-one`, …).
 *
 * A dynamic segment rather than five near-identical page files: the slot key IS
 * the row's primary key (lib/admin/homepage.ts), so the registry decides which
 * slots exist, what the page is called, and which form renders. An unknown
 * segment 404s before any query runs, and each branch reads ONLY the options
 * its own picker needs.
 *
 * Every read returns a nullable detail: a slot that was never seeded simply
 * starts from the form's own defaults and is created by the action's upsert.
 */
export default async function HomepageSlotPage({
  params,
}: {
  params: Promise<{ locale: string; slot: string }>;
}) {
  const { locale, slot } = await params;
  if (!isLocale(locale)) notFound();
  if (!isHomepageSlot(slot)) notFound();

  const t = translations[locale];
  const meta = HOMEPAGE_SLOT_META[slot];

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey={meta.labelKey}
          descriptionKey={meta.descriptionKey}
          actions={
            <BackLink
              href={HOMEPAGE_HREF}
              label={`${t["admin.crud.back"]} — ${t["admin.nav.homepage"]}`}
            />
          }
        />
        {await renderSlotForm(slot)}
      </div>
    </div>
  );
}

/** The slot's saved values plus whatever its entity picker lists. */
async function renderSlotForm(slot: HomepageSlotKey) {
  switch (slot) {
    case "flagship-one": {
      const [detail, flagships] = await Promise.all([
        getFlagshipOneFeatureAdminDetail(),
        getFlagshipAdminRows(),
      ]);
      return <FlagshipOneFeatureForm detail={detail} flagships={flagships} />;
    }
    case "project-banner": {
      const [detail, projects] = await Promise.all([
        getProjectBannerFeatureAdminDetail(),
        getProjectAdminRows(),
      ]);
      return <ProjectBannerFeatureForm detail={detail} projects={projects} />;
    }
    case "project-dark-background": {
      const [detail, projects] = await Promise.all([
        getProjectDarkBackgroundFeatureAdminDetail(),
        getProjectAdminRows(),
      ]);
      return (
        <ProjectDarkBackgroundFeatureForm detail={detail} projects={projects} />
      );
    }
    case "home-collection": {
      const detail = await getHomeCollectionFeatureAdminDetail();
      return <HomeCollectionFeatureForm detail={detail} />;
    }
    case "catalogue": {
      const [detail, catalogueItems] = await Promise.all([
        getCatalogueFeatureAdminDetail(),
        getCatalogueItemAdminRows(),
      ]);
      return (
        <CatalogueFeatureForm detail={detail} catalogueItems={catalogueItems} />
      );
    }
  }
}
