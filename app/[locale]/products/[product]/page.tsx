import ProductCategoryPageClient from "@/components/products/ProductCategoryPageClient";
import { productCategories } from "@/lib/data/productCategories";
import { notFound } from "next/navigation";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
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
  const { product, locale } = await params;
  const category = productCategories.find((c) => c.slug === product);

  if (!category) notFound();

  const lang = resolveLocale(locale);
  // Server-side dictionary lookup (the useLanguage t() function is
  // client-only). Localized category name (e.g. "نورپردازی" / "LIGHTING")
  // from the shared dictionary — data `name` fields are English-only
  // placeholders.
  const dict = translations[lang] as Record<string, string>;
  const name = dict[category.i18nKey] ?? category.name;

  return buildLocalizedMetadata({
    locale,
    path: `/products/${product}`,
    title: dict["page.product.title"].replace("{name}", name),
    description: dict["page.product.description"].replace("{name}", name),
    image: category.products[0]?.images[0],
  });
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { product } = await params;
  return <ProductCategoryPageClient productSlug={product} />;
}
