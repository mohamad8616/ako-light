import ProductPageClient from "@/components/products/prod/ProductPageClient";
import { getProduct, products } from "@/lib/data/productCategories";
import { notFound } from "next/navigation";
import { translations } from "@/lib/i18n/translations";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import { productDescription, productName } from "@/lib/i18n/localized";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  productJsonLd,
} from "@/lib/seo/structuredData";
import { siteName } from "@/lib/seo/config";
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

  const name = productName(tFn, productt.slug);
  const description = trimDescription(productDescription(tFn, productt.slug));
  const url = absoluteUrl(`/products/${product}/${prod}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const productsLabel = dict["page.products.title"];
  const categoryLabel = dict[productt.categoryLabel] ?? productt.categoryLabel;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: productt.images[0],
      brand: siteName,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: productsLabel, path: "/products" },
        { name: categoryLabel, path: `/products/${product}` },
        { name: name, path: `/products/${product}/${prod}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/products/${product}/${prod}`,
    title: name,
    description,
    image: productt.images[0],
    jsonLd: jsonLdData,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod, locale } = await params;
  const productt = getProduct(product, prod);
  if (!productt) notFound();

  const lang = resolveLocale(locale);
  const dict = translations[lang] as Record<string, string>;
  const tFn = (key: string) => dict[key] ?? key;

  const name = productName(tFn, productt.slug);
  const description = trimDescription(productDescription(tFn, productt.slug));
  const url = absoluteUrl(`/products/${product}/${prod}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const productsLabel = dict["page.products.title"];
  const categoryLabel = dict[productt.categoryLabel] ?? productt.categoryLabel;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: productt.images[0],
      brand: siteName,
    }),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: productsLabel, path: "/products" },
        { name: categoryLabel, path: `/products/${product}` },
        { name: name, path: `/products/${product}/${prod}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <ProductPageClient productSlug={product} prodSlug={prod} link="link" />
    </>
  );
}
