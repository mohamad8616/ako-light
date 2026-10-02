import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SiteSettingsForm } from "@/components/admin/settings/SiteSettingsForm";
import { SocialLinksManager } from "@/components/admin/settings/SocialLinksManager";
import {
  getSiteSettings,
  getSocialLinks,
} from "@/lib/repositories/site-settings";

/**
 * Pass 13.5D — the global site settings screen.
 *
 * Access is enforced by the `(admin)` layout's `requireAdminAccess()` (with
 * `proxy.ts` in front of it), exactly like every other section page: a plain
 * `user` never reaches this function, and the actions it calls re-check the
 * role themselves — so nothing here depends on the sidebar having hidden a
 * link. ADMIN and OWNER both get the screen; settings are not owner-only.
 *
 * Server component: the settings row and the link list are read ONCE per
 * request and handed to the client forms. Both reads are React-`cache()`d, so
 * the navbar, the footer and `generateMetadata` share these same queries rather
 * than issuing their own.
 *
 * `settings` may be null on a fresh database — the form renders its empty state
 * and the first save creates the singleton row.
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [settings, links] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.nav.settings"
          descriptionKey="admin.section.settings.description"
        />
        <SiteSettingsForm settings={settings} />
        <SocialLinksManager links={links} />
      </div>
    </div>
  );
}
