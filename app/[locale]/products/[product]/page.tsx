import ProductCategoryPageClient from "@/components/products/ProductCategoryPageClient";
import { productCategories } from "@/lib/data/productCategories";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; product: string }>;
}

export async function generateStaticParams() {
  return productCategories.map((c) => ({ product: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { product } = await params;
  const category = productCategories.find((c) => c.slug === product);

  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];

  if (!category) {
    return {
      title: t["page.products.title"],
      description: t["page.products.description"],
    };
  }

  const name = pick(category.name, lang);

  return {
    title: t["page.product.title"].replace("{name}", name),
    description: t["page.product.description"].replace("{name}", name),
  };
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { product } = await params;
  return <ProductCategoryPageClient productSlug={product} />;
}
