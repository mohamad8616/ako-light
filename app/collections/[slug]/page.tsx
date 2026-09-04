import AboutCollection from "@/components/collections/collection/AboutCollection";
import CollectionHero from "@/components/collections/collection/CollectionHero";
import ImageGallery from "@/components/collections/collection/ImageGallery";
import ProductsInCollectionSection from "@/components/collections/collection/ProductsInCollectionSection";
import { collections } from "@/lib/data/collections";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
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
