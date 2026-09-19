import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import PageLoader from "@/components/ui/PageLoader";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { getProductCategories } from "@/lib/repositories/product-categories";

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
  // Fetched once per request (React cache()-deduped with page-level calls)
  // and threaded through Navbar -> ProductsSheet for the nav categories.
  const navCategories = await getProductCategories();

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
