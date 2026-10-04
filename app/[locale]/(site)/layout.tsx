import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import PageLoader from "@/components/ui/PageLoader";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { isLocale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getNavCategories } from "@/lib/repositories/product-categories";
import {
  getActiveSocialLinks,
  getSiteSettings,
} from "@/lib/repositories/site-settings";
import { notFound } from "next/navigation";

/**
 * Public site chrome.
 *
 * Lives in the (site) route group so the private admin dashboard in (admin)
 * renders without it — route groups never affect the URL, only which layout
 * wraps the pages inside them.
 *
 * It also owns the PUBLIC dictionary for this subtree. The [locale] layout above
 * it provides only a small shell (enough for not-found), so each route group
 * hands its own subtree the dictionary it needs: (site) the public strings,
 * (admin) the admin strings. That is what keeps the public dictionary out of the
 * client graph for admin routes, and keeps the unused locale out of it for both.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // The nav menu only needs each category's slug + translation key, so this
  // uses the light reader rather than getProductCategories() — that one
  // eager-loads EVERY product with its images, and because Navbar is a client
  // component the whole catalog would be serialized into this layout's payload
  // on every public page. See getNavCategories().
  // Site settings and social links are read HERE, once, and passed down —
  // rather than each chrome component querying for itself. All three reads are
  // React-`cache()`d, so `generateMetadata` in the parent layout shares the
  // same settings query instead of issuing a second one.
  //
  // Only the ACTIVE links are fetched: the public site has no use for a hidden
  // one, and `getActiveSocialLinks` is the reader that encodes that rule.
  const [navCategories, settings, socialLinks] = await Promise.all([
    getNavCategories(),
    getSiteSettings(),
    getActiveSocialLinks(),
  ]);

  return (
    <LanguageProvider locale={locale} dictionary={translations[locale]}>
      <Navbar categories={navCategories} logoUrl={settings?.logoUrl ?? null} />
      <PageLoader />
      <Preloader />
      <PageTransition>{children}</PageTransition>
      <NewsletterSectionWrapper />
      <Footer
        logoUrl={settings?.logoUrl ?? null}
        socialLinks={socialLinks.map((link) => ({
          key: link.id,
          label: link.label,
          href: link.url,
          icon: link.platform,
        }))}
      />
    </LanguageProvider>
  );
}
