import ProductPageClient from "@/components/products/prod/ProductPageClient";
import { getProduct, products } from "@/lib/data/productCategories";
import { notFound } from "next/navigation";
import { translations } from "@/lib/i18n/translations";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import { productDescription, productName } from "@/lib/i18n/localized";
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
  const { product, prod, locale } = await params;
  const productt = getProduct(product, prod);

  if (!productt) notFound();

  const lang = resolveLocale(locale);
  // Server-side dictionary lookup adapter matching the t(key) signature
  // that productName()/productDescription() expect.
  const dict = translations[lang] as Record<string, string>;
  const tFn = (key: string) => dict[key] ?? key;

  return buildLocalizedMetadata({
    locale,
    path: `/products/${product}/${prod}`,
    title: productName(tFn, productt.slug),
    description: trimDescription(productDescription(tFn, productt.slug)),
    image: productt.images[0],
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod } = await params;
  return <ProductPageClient productSlug={product} prodSlug={prod} link="link" />;
}
