"use client";

import PageTitle from "@/utility/PageTitle";

interface ProductsHeaderProps {
  title?: string;
}

export default function ProductsHeader({ title = "Products" }: ProductsHeaderProps) {
  return (
    <header className="bg-background w-full pt-28 md:pt-76">
      <PageTitle>{title}</PageTitle>
    </header>
  );
}
