import ProductPageClient from "@/components/products/prod/ProductPageClient";
import { getProduct, products } from "@/lib/data/productCategories";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; product: string; prod: string }>;
}

export function generateStaticParams() {
  return Object.values(products).map((p) => ({
    product: p.category,
    prod: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { product, prod } = await params;
  const productt = getProduct(product, prod);

  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];

  if (!productt) {
    return {
      title: t["page.products.title"],
      description: t["page.products.description"],
    };
  }

  const name = pick(productt.name, lang);

  return {
    title: t["page.product.title"].replace("{name}", name),
    description: t["page.product.description"].replace("{name}", name),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod } = await params;
  return <ProductPageClient productSlug={product} prodSlug={prod} link="link" />;
}
