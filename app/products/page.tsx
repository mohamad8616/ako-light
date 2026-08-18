import ProductsHeader from "@/components/products/ProductsHeader";
import ProductsGrid from "@/components/products/ProductsGrid";

export default function ProductsPage() {
  return (
    <main className="w-full bg-background">
      <ProductsHeader />
      <ProductsGrid />
    </main>
  );
}
