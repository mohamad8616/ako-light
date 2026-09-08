import AboutCollection from "@/components/collections/collection/AboutCollection";
import CollectionHero from "@/components/collections/collection/CollectionHero";
import ImageGallery from "@/components/collections/collection/ImageGallery";
import ProductsInCollectionSection from "@/components/collections/collection/ProductsInCollectionSection";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { collections } from "@/lib/data/collections";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections.find((c) => c.id === slug);

  if (!collection) return notFound();

  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];
  const name = pick(collection.name, lang);

  return {
    title: t["page.collection.title"].replace("{name}", name),
    description: t["page.collection.description"].replace("{name}", name),
  };
}

const page = async ({ params }: PageProps) => {
  const { slug } = await params;
  const collection = collections.find((c) => c.id === slug);

  if (!collection) return notFound();

  return (
    <main className="bg-background-secondary w-full space-y-48">
      <CollectionHero collection={collection} />
      <AboutCollection collection={collection} />
      <ImageGallery />
      <ProductsInCollectionSection />
    </main>
  );
};

export default page;
