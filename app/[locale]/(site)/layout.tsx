import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import PageLoader from "@/components/ui/PageLoader";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { getNavCategories } from "@/lib/repositories/product-categories";
import {
  getActiveSocialLinks,
  getSiteSettings,
} from "@/lib/repositories/site-settings";

/**
 * Public site chrome.
 *
 * Lives in the (site) route group so the private admin dashboard in (admin)
 * renders without it — route groups never affect the URL, only which layout
 * wraps the pages inside them.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <>
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
    </>
  );
}
