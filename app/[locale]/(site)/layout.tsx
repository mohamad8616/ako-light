import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import PageLoader from "@/components/ui/PageLoader";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { getNavCategories } from "@/lib/repositories/product-categories";

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
  const navCategories = await getNavCategories();

  return (
    <>
      <Navbar categories={navCategories} />
      <PageLoader />
      <Preloader />
      <PageTransition>{children}</PageTransition>
      <NewsletterSectionWrapper />
      <Footer />
    </>
  );
}
