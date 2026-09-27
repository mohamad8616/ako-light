import "dotenv/config";
import { productCategories } from "@/lib/data/productCategories";
import { prisma } from "@/lib/db/prisma";

const categorySlugs = new Set(productCategories.map((c) => c.slug));
const seededProducts = productCategories.flatMap((category) =>
  category.products.filter(
    (product) =>
      product.slug && categorySlugs.has(product.category || category.slug),
  ),
);
console.log(`STATIC seededProducts (schema-test filter): ${seededProducts.length}`);
console.log(`STATIC raw embedded: ${productCategories.reduce((n, c) => n + c.products.length, 0)}`);
for (const category of productCategories) {
  for (const p of category.products) {
    const eff = p.category || category.slug;
    if (!p.slug || !categorySlugs.has(eff)) {
      console.log(`FILTERED OUT: cat=${category.slug} prod=${p.slug} effCat=${eff}`);
    }
    if (p.slug === undefined || (p as unknown as {slug?: string}).slug === "") {
      console.log(`EMPTY SLUG: cat=${category.slug} id=${p.id}`);
    }
  }
}
console.log(`DB products: ${await prisma.product.count()}`);
await prisma.$disconnect();
