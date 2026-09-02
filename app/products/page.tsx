import ProductsHeader from "@/components/products/ProductsHeader";
import ProductsGrid from "@/components/products/ProductsGrid";
import { productCategories } from "@/lib/data/productCategories";

export default function ProductsPage() {
  return (
    <main className="w-full bg-background">
      <ProductsHeader />
      <ProductsGrid categories={productCategories}/>
    </main>
  );
}
