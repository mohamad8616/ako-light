import { jsonLdScript } from "@/lib/seo/structuredData";
import type { JsonLdObject } from "@/lib/seo/structuredData";

/**
 * Server component that renders the page-level JSON-LD scripts.
 * The layout owns the global Organization + WebSite; pages use this for
 * their WebPage/Product/CreativeWork/Person/BreadcrumbList payloads.
 */
export function JsonLdRenderer({ data }: { data: JsonLdObject[] }) {
  if (!data || data.length === 0) return null;
  return (
    <>
      {data.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }}
        />
      ))}
    </>
  );
}