import CatalogueSection from "@/components/home/CatalogueSection";
import FlagshipOne from "@/components/home/flagshipOne";
import HeroSection from "@/components/home/HeroSection";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import ProjectBanner from "@/components/home/projectBanner";
import ProjectWithDarkBackground from "@/components/home/projectWithDarkBackground";
import VideoSection from "@/components/home/VideoSection";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import { getProductCategories } from "@/lib/repositories/product-categories";
import {
  getCatalogueFeature,
  getFlagshipOneFeature,
  getHomeCollectionFeature,
  getProjectBannerFeature,
  getProjectDarkBackgroundFeature,
} from "@/lib/repositories/homepage-features";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translations[resolveLocale(locale)];

  return buildLocalizedMetadata({
    locale,
    path: "/",
    title: t["page.home.title"],
    description: t["page.home.description"],
    // The home title already carries the brand — no template suffix.
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  // Every banner sources its content from its homepage feature slot (see
  // lib/repositories/homepage-features.ts) — one parallel round of reads.
  const [
    productCategories,
    flagshipOne,
    catalogue,
    homeCollection,
    projectBanner,
    projectDarkBackground,
  ] = await Promise.all([
    getProductCategories(),
    getFlagshipOneFeature(),
    getCatalogueFeature(),
    getHomeCollectionFeature(),
    getProjectBannerFeature(),
    getProjectDarkBackgroundFeature(),
  ]);

  // One carousel tile per category, previewed by a product image.
  //
  // This used to be `image: category.products[0].images[0]`, which assumed both
  // that the category has a product AND that the product has at least one
  // gallery row. Neither holds: a category can be empty, and a product added
  // without images has `images === []`. Either way the tile received
  // `image: undefined`, which surfaced as three separate browser complaints —
  // a duplicate/missing React `key`, an empty `src` (which makes the browser
  // re-download the whole page), and Next's "missing required src" error.
  //
  // So: take the first product that actually HAS an image (falling back to its
  // hero image) and skip categories that have none. A missing tile reads far
  // better than a broken one, and `image` is guaranteed to be a non-empty
  // string for everything that survives.
  const productCategory = productCategories.flatMap((category) => {
    const preview = category.products
      .map((product) => product.images[0] ?? product.heroImage)
      .find((src) => Boolean(src));

    if (!preview) return [];

    return [
      {
        name: category.i18nKey,
        image: preview,
        link: `/products/${category.slug}`,
      },
    ];
  });
  return (
    <main className="font-noora bg-background-secondary w-full space-y-18 lg:space-y-60">
      <HeroSection />
      <ImageGalleryCarousel purpose="link" category={productCategory} />
      <FlagshipOne data={flagshipOne} />
      <VideoSection />
      <CatalogueSection data={catalogue} />
      <HomeCollectionBanner data={homeCollection} />
      <ProjectBanner data={projectBanner} />
      <ProjectWithDarkBackground data={projectDarkBackground} />
    </main>
  );
}
