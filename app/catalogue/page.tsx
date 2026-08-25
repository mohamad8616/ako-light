import CatalogueGrid from "@/components/catalogue/CatalogueGrid";

export const metadata = {
  title: "Catalogue | Henge",
  description: "Download Henge's catalogues and collection publications.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
      <CatalogueGrid />
    </main>
  );
}
