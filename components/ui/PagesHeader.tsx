"use client";
import PageTitle from "@/utility/PageTitle";

const PagesHeader = ({ title }: { title: string }) => {
  return (
    <header

      className="bg-background w-full pt-28 md:pt-36"
    >
      <PageTitle>{title}</PageTitle>
    </header>
  );
};

export default PagesHeader;
