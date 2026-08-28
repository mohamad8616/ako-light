# Dynamic Products Category Page

Build dynamic routes `/products/[product]` and `/products/[product]/[prod]`. The category page shows sub-categories in the same grid layout as `/products`, with a two-image hover crossfade on each card. The sub-category page shows items within that sub-category.

## 1. Existing File: `lib/data/productCategories.ts`

Already created in previous step. Contains 11 top-level categories, each with sub-categories that have `name`, `slug`, `image`, and `hoverImage`.

## 2. Modify: `components/products/ProductsHeader.tsx`

Already has optional `title` prop from previous step. No change needed.

## 3. Modify: `components/products/ProductsGrid.tsx`

Already has optional `categories` prop from previous step. Add an optional `parentSlug` prop and pass it to each `ProductCategoryCard`.

```tsx
interface ProductsGridProps {
  categories?: Array<{ name: string; slug: string; image: string; hoverImage?: string }>;
  parentSlug?: string;
}

// ... existing code ...

export default function ProductsGrid({ categories, parentSlug }: ProductsGridProps) {
  const items = categories ?? defaultCategories;

  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-x-3 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {items.map((category, i) => (
            <ProductCategoryCard key={category.slug} index={i} parentSlug={parentSlug} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

## 4. Modify: `components/products/ProductCategoryCard.tsx`

Add optional `parentSlug` prop. When present, the link nests under the parent category. This fixes the routing bug where clicking a sub-category from `/products/tables` incorrectly goes to `/products/dining-table` instead of `/products/tables/dining-table`.

```tsx
interface ProductCategoryCardProps {
  name: string;
  slug: string;
  image: string;
  hoverImage?: string;
  index: number;
  parentSlug?: string;
}

export default function ProductCategoryCard({
  name,
  slug,
  image,
  hoverImage,
  index,
  parentSlug,
}: ProductCategoryCardProps) {
  const href = parentSlug ? `/products/${parentSlug}/${slug}` : `/products/${slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <Link href={href} className="group block">
        {/* ... existing image/card code ... */}
      </Link>
    </motion.div>
  );
}
```

## 5. Modify: `app/products/[product]/page.tsx`

Pass `parentSlug={params.product}` to `ProductsGrid` so sub-category cards link correctly.

```tsx
export default function ProductCategoryPage({ params }: PageProps) {
  const category = productCategories.find((c) => c.slug === params.product);

  if (!category) {
    notFound();
  }

  return (
    <main className="w-full bg-background">
      <ProductsHeader title={category.name} />
      <ProductsGrid categories={category.subCategories} parentSlug={params.product} />
    </main>
  );
}
```

## 6. New File: `components/products/ProductList.tsx`

Create a component to render individual products within a sub-category. Reuse the existing horizontal row pattern from `components/ui/Row.tsx` for consistency with the rest of the site.

```tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { EASE } from "@/utility/HomepageSection";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import { products } from "@/lib/data/products";

interface ProductListItemProps {
  name: string;
  slug: string;
  image: string;
  index: number;
  category: string;
}

function ProductListItem({ name, slug, image, index, category }: ProductListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.5, delay: (index % 4) * 0.08, ease: EASE }}
      className="border-b border-white/20"
    >
      <div className="flex items-end gap-8 py-8 sm:gap-12 md:py-10">
        <div className="h-30 w-30 shrink-0 overflow-hidden sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-60 lg:w-60">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover grayscale transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-102"
          />
        </div>
        <h2 className="flex-1 truncate text-2xl leading-none tracking-tighter text-white uppercase transition-all duration-700 sm:text-3xl md:text-4xl">
          {name}
        </h2>
        <span className="text-background-secondary text-sm tracking-tight uppercase hidden md:block">
          {category}
        </span>
        <PlusTextBtn text="Discover" />
      </div>
    </motion.div>
  );
}

interface ProductListProps {
  items: Array<{ name: string; slug: string; image: string; category: string }>;
}

export default function ProductList({ items }: ProductListProps) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-background-secondary">
        No products found in this category.
      </div>
    );
  }

  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {items.map((item, i) => (
          <ProductListItem key={item.slug} index={i} {...item} />
        ))}
      </div>
    </section>
  );
}
```

## 7. Modify: `lib/data/products.ts`

Add an optional `subCategory` field to the `Product` interface and populate it for relevant products so they can be grouped under sub-categories.

```ts
export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  designer: string;
  collection: string;
  image: string;
  description: string;
}
```

Add `subCategory` values to products that belong to specific sub-categories. For example:
- Sisma → `subCategory: "dining-table"`
- S34/5 → `subCategory: "dining-table"`
- Breccia Medicea → `subCategory: "dining-table"`
- Henge 071020 → `subCategory: "pendant-light"`
- etc.

Products without a `subCategory` will fall back to matching by `category`.

## 8. Modify: `app/products/[product]/[prod]/page.tsx`

Implement the sub-category product listing page.

```tsx
import { notFound } from "next/navigation";
import ProductsHeader from "@/components/products/ProductsHeader";
import ProductList from "@/components/products/ProductList";
import { productCategories } from "@/lib/data/productCategories";
import { products } from "@/lib/data/products";

interface PageProps {
  params: { product: string; prod: string };
}

export default function ProductSubCategoryPage({ params }: PageProps) {
  const category = productCategories.find((c) => c.slug === params.product);

  if (!category) {
    notFound();
  }

  const subCategory = category.subCategories.find((sc) => sc.slug === params.prod);

  if (!subCategory) {
    notFound();
  }

  const filteredProducts = products.filter((p) => {
    if (p.subCategory === params.prod) return true;
    if (!p.subCategory && p.category === category.name) return true;
    return false;
  });

  return (
    <main className="w-full bg-background">
      <ProductsHeader title={`${category.name} / ${subCategory.name}`} />
      <ProductList items={filteredProducts.map((p) => ({ name: p.name, slug: p.id, image: p.image, category: p.category }))} />
    </main>
  );
}

export async function generateStaticParams() {
  const params: { product: string; prod: string }[] = [];

  for (const category of productCategories) {
    for (const sub of category.subCategories) {
      params.push({ product: category.slug, prod: sub.slug });
    }
  }

  return params;
}
```

## 9. Validation

- Run `npm run lint`
- Run `npx next build`
- Visit `/products` and verify top-level cards link to `/products/{slug}`
- Visit `/products/tables` and verify sub-category cards link to `/products/tables/{sub-slug}`
- Visit `/products/tables/dining-table` and verify it shows relevant products
- Verify hover crossfade works on `/products` and `/products/{category}` levels
- Verify invalid slugs show Next.js not-found page
