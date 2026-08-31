import AboutCollection from "@/components/collections/collection/AboutCollection";
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
    <main className="w-full bg-background-secondary space-y-48">
      <PictureHero
        name={`${collection.name} Collection`}
        image={collection.image}
      />
      <AboutCollection collection={collection} />
    </main>
  );
};

export default page;
