import AboutCollection from "@/components/collections/collection/AboutCollection";
import CollectionHero from "@/components/collections/collection/CollectionHero";
import ImageGallery from "@/components/collections/collection/ImageGallery";
import ProductsInCollectionSection from "@/components/collections/collection/ProductsInCollectionSection";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { getCollection } from "@/lib/repositories/collections";
import { getProductCategories } from "@/lib/repositories/product-categories";
import {
  buildLocalizedMetadata,
  resolveLocale,
} from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  collectionPageJsonLd,
} from "@/lib/seo/structuredData";
import { redirectIfSlugRenamed } from "@/lib/navigation/slugRedirect";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    // Renamed slug → permanent redirect to the current URL instead of a 404.
    await redirectIfSlugRenamed("collection", slug, { locale });
    notFound();
  }

  const lang = resolveLocale(locale);
  const t = translations[lang];
  const name = pick(collection.name, lang);
  const title = t["page.collection.title"].replace("{name}", name);
  const description = t["page.collection.description"].replace("{name}", name);
  const url = absoluteUrl(`/collections/${slug}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const collectionsLabel = t["page.collections.title"];

  const jsonLdData = [
    collectionPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: collectionsLabel, path: "/collections" },
        { name: name, path: `/collections/${slug}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/collections/${slug}`,
    title,
    description,
    image: collection.image,
    jsonLd: jsonLdData,
  });
}

const page = async ({ params }: PageProps) => {
  const { slug, locale } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    // Renamed slug → permanent redirect to the current URL instead of a 404.
    await redirectIfSlugRenamed("collection", slug, { locale });
    return notFound();
  }

  const lang = resolveLocale(locale);
  const t = translations[lang];
  const name = pick(collection.name, lang);
  const title = t["page.collection.title"].replace("{name}", name);
  const description = t["page.collection.description"].replace("{name}", name);
  const url = absoluteUrl(`/collections/${slug}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const collectionsLabel = t["page.collections.title"];

  const jsonLdData = [
    collectionPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: collectionsLabel, path: "/collections" },
        { name: name, path: `/collections/${slug}` },
      ],
      lang,
    ),
  ];

  const groupedCategories = await getProductCategories();

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="bg-background-secondary w-full space-y-48">
        <CollectionHero collection={collection} />
        <AboutCollection collection={collection} />
        <ImageGallery />
        <ProductsInCollectionSection categories={groupedCategories} />
      </main>
    </>
  );
};

export default page;
