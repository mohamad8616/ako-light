import AboutCollection from "@/components/collections/collection/AboutCollection";
import ImageGallery from "@/components/collections/collection/ImageGallery";
import PictureHero from "@/components/ui/PictureHero";
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
      <PictureHero
        name={`${collection.name} Collection`}
        image={collection.image}
      />
      <AboutCollection collection={collection} />
      <ImageGallery />
    </main>
  );
};

export default page;
