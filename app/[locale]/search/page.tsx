import SearchHeader from "@/components/search/SearchHeader";

// TODO(localized-metadata pass): add generateMetadata here. It needs new
// `page.search.*` dictionary keys, which don't exist yet.

export default function DesignersPage() {
  return (
    <main className="bg-background min-h-screen h-auto mt-40 lg:mt-56">
      <SearchHeader />
    </main>
  );
}
