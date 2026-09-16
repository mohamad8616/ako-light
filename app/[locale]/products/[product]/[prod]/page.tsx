import ProductPageClient from "@/components/products/prod/ProductPageClient";
import {
  getProduct,
  getProducts,
  getProductsByCategory,
} from "@/lib/repositories/products";
import {
  getProductImages,
  getProductPrimaryImage,
} from "@/lib/repositories/product-images";
import { productDescription, productName } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { siteName } from "@/lib/seo/config";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  buildLocalizedMetadata,
  resolveLocale,
  trimDescription,
} from "@/lib/seo/metadata";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  productJsonLd,
} from "@/lib/seo/structuredData";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; product: string; prod: string }>;
}

export async function generateStaticParams() {
  const allProducts = await getProducts();
  return allProducts.map((p) => ({
    product: p.category,
    prod: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { product, prod, locale } = await params;
  const productt = await getProduct(product, prod);

  if (!productt) notFound();

  // DB-sourced product images (ProductImage rows). The flat Product.images
  // column was dropped in Pass 11B. The primary image (isPrimary, falling
  // back to the first image by sortOrder) backs JSON-LD / OG metadata.
  const primaryImage = await getProductPrimaryImage(productt.slug);
  const detailImage = primaryImage?.url ?? productt.heroImage;

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
  const categoryLabel = dict[productt.category] ?? productt.category;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: detailImage,
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
    image: detailImage,
    jsonLd: jsonLdData,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { product, prod, locale } = await params;
  const productt = await getProduct(product, prod);
  if (!productt) notFound();

  // DB-sourced gallery images (ProductImage rows, sortOrder order), fetched
  // server-side and passed down like every other catalog migration.
  const productImages = await getProductImages(productt.slug);
  const primaryPageImage = await getProductPrimaryImage(productt.slug);

  // Same-category candidates for the related-products section (self
  // excluded); fetched server-side so the client never needs the catalog.
  const sameCategoryProducts = (await getProductsByCategory(product)).filter(
    (p) => p.slug !== prod,
  );

  const lang = resolveLocale(locale);
  const dict = translations[lang] as Record<string, string>;
  const tFn = (key: string) => dict[key] ?? key;

  const name = productName(tFn, productt.slug);
  const description = trimDescription(productDescription(tFn, productt.slug));
  const url = absoluteUrl(`/products/${product}/${prod}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const productsLabel = dict["page.products.title"];
  const categoryLabel = dict[productt.category] ?? productt.category;

  const jsonLdData = [
    productJsonLd({
      name,
      description,
      url,
      image: primaryPageImage?.url ?? productt.heroImage,
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
      <ProductPageClient
        productt={productt}
        link="link"
        sameCategoryProducts={sameCategoryProducts}
        galleryImages={productImages.map((img) => img.url)}
      />
    </>
  );
}
