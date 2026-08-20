import CollectionsHeader from "@/components/collections/CollectionsHeader";
import CollectionsGrid from "@/components/collections/CollectionsList";

export default function CollectionsPage() {
  return (
    <main className="w-full bg-background">
      <CollectionsHeader />
      <CollectionsGrid />
    </main>
  );
}
