import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminText } from "@/components/admin/AdminText";
import { CatalogueFeatureForm } from "@/components/admin/catalog/homepage/CatalogueFeatureForm";
import { FlagshipOneFeatureForm } from "@/components/admin/catalog/homepage/FlagshipOneFeatureForm";
import { HeroFeatureForm } from "@/components/admin/catalog/homepage/HeroFeatureForm";
import { HomeCollectionFeatureForm } from "@/components/admin/catalog/homepage/HomeCollectionFeatureForm";
import { ProjectBannerFeatureForm } from "@/components/admin/catalog/homepage/ProjectBannerFeatureForm";
import { ProjectDarkBackgroundFeatureForm } from "@/components/admin/catalog/homepage/ProjectDarkBackgroundFeatureForm";
import { VideoFeatureForm } from "@/components/admin/catalog/homepage/VideoFeatureForm";
import {
  HOMEPAGE_SLOT_KEYS,
  HOMEPAGE_SLOT_META,
  type HomepageSlotKey,
} from "@/lib/admin/homepage";
import { isLocale } from "@/lib/i18n/routing";
import { getAdminDictionary } from "@/lib/i18n/admin-translations";
import { getCatalogueItemAdminRows } from "@/lib/repositories/catalogue";
import { getFlagshipAdminRows } from "@/lib/repositories/flagships";
import {
  getCatalogueFeatureAdminDetail,
  getFlagshipOneFeatureAdminDetail,
  getHeroFeatureAdminDetail,
  getHomeCollectionFeatureAdminDetail,
  getProjectBannerFeatureAdminDetail,
  getProjectDarkBackgroundFeatureAdminDetail,
  getVideoFeatureAdminDetail,
} from "@/lib/repositories/homepage-features";
import { getProjectAdminRows } from "@/lib/repositories/projects";
import { notFound } from "next/navigation";

/**
 * The homepage content editor.
 *
 * ── One page, like /admin/about ─────────────────────────────────────────────
 *
 * This used to be a hub of summary cards, each linking to its own
 * `/admin/homepage/[slot]` view. Editing two banners meant two navigations, and
 * the hub itself carried no editable content — the same complaint the About
 * page never had. So the hub and the per-slot routes are GONE: every homepage
 * section now renders its form inline, in the order the homepage renders its
 * banners (HOMEPAGE_SLOT_KEYS). Each form keeps its own react-hook-form
 * instance and Save button, exactly like the About/S34 section forms — editing
 * the hero never re-submits the video section.
 *
 * ── Reads ───────────────────────────────────────────────────────────────────
 *
 * Content comes from the SAME admin reads the per-slot pages used
 * (`get*FeatureAdminDetail`), so the admin sees exactly what the site shows; a
 * section whose row is missing prefills from the form's own defaults and is
 * created by the action's upsert on first save. The picker sources (flagships,
 * projects, catalogue items) are fetched once here and shared, and the ten
 * reads are independent so they go out in ONE `Promise.all`.
 *
 * The About and S34 hero videos are deliberately absent: they are edited on
 * their own pages (see lib/admin/homepage.ts).
 *
 * Access to every route below (admin) is gated by the layout's
 * requireAdminAccess(); each action re-authorizes on its own.
 */
export default async function HomepageAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [
    hero,
    flagshipOne,
    flagships,
    video,
    catalogue,
    catalogueItems,
    homeCollection,
    projectBanner,
    projectDarkBackground,
    projects,
  ] = await Promise.all([
    getHeroFeatureAdminDetail(),
    getFlagshipOneFeatureAdminDetail(),
    getFlagshipAdminRows(),
    getVideoFeatureAdminDetail(),
    getCatalogueFeatureAdminDetail(),
    getCatalogueItemAdminRows(),
    getHomeCollectionFeatureAdminDetail(),
    getProjectBannerFeatureAdminDetail(),
    getProjectDarkBackgroundFeatureAdminDetail(),
    getProjectAdminRows(),
  ]);

  const t = getAdminDictionary(locale);

  /**
   * One form per section key. The `Record<HomepageSlotKey, …>` is exhaustive on
   * purpose: adding a key to the registry fails tsc until its form is wired up
   * here, so a new banner can never silently go missing from the page.
   */
  const forms: Record<HomepageSlotKey, React.ReactNode> = {
    hero: <HeroFeatureForm detail={hero} />,
    "flagship-one": (
      <FlagshipOneFeatureForm detail={flagshipOne} flagships={flagships} />
    ),
    video: <VideoFeatureForm detail={video} />,
    catalogue: (
      <CatalogueFeatureForm
        detail={catalogue}
        catalogueItems={catalogueItems}
      />
    ),
    "home-collection": <HomeCollectionFeatureForm detail={homeCollection} />,
    "project-banner": (
      <ProjectBannerFeatureForm detail={projectBanner} projects={projects} />
    ),
    "project-dark-background": (
      <ProjectDarkBackgroundFeatureForm
        detail={projectDarkBackground}
        projects={projects}
      />
    ),
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.homepage"
          descriptionKey="admin.section.homepage.description"
        />
        {HOMEPAGE_SLOT_KEYS.map((slot) => (
          <HomepageSection
            key={slot}
            title={t[HOMEPAGE_SLOT_META[slot].labelKey]}
            description={t[HOMEPAGE_SLOT_META[slot].descriptionKey]}
          >
            {forms[slot]}
          </HomepageSection>
        ))}
      </div>
    </div>
  );
}

/**
 * One section's heading + its form.
 *
 * The heading is what the old hub card used to say, kept so the stacked page
 * still reads as "hero, then flagship, then video…" rather than as an
 * undifferentiated pile of "Content" cards. `AdminText` gives each heading
 * bidi isolation, so an English label sits correctly inside the RTL shell.
 */
function HomepageSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <AdminText
          as="h3"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {title}
        </AdminText>
        <AdminText as="p" className="text-muted-foreground text-sm">
          {description}
        </AdminText>
      </div>
      {children}
    </section>
  );
}
