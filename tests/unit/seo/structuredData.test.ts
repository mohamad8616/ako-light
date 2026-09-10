import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/seo/config";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  collectionPageJsonLd,
  creativeWorkJsonLd,
  jsonLdScript,
  organizationJsonLd,
  personJsonLd,
  productJsonLd,
  webPageJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/structuredData";

describe("jsonLdScript", () => {
  it("serializes the object as JSON", () => {
    const obj = { "@context": "https://schema.org", "@type": "WebPage", name: "x" };
    expect(jsonLdScript(obj)).toBe(JSON.stringify(obj));
  });

  it("escapes < to \\u003c to prevent markup injection", () => {
    const raw = jsonLdScript({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "</script><script>bad()</script>",
    });
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u003c");

    // Round-trips back to the same object after JSON.parse.
    expect(JSON.parse(raw).name).toBe("</script><script>bad()</script>");
  });
});

describe("absoluteUrl", () => {
  it("builds locale-aware absolute URLs", () => {
    expect(absoluteUrl("/about", "en")).toBe(`${siteUrl}/en/about`);
    expect(absoluteUrl("/about", "fa")).toBe(`${siteUrl}/about`);
    expect(absoluteUrl("/", "en")).toBe(`${siteUrl}/en`);
    expect(absoluteUrl("/", "fa")).toBe(`${siteUrl}/`);
  });
});

describe("organizationJsonLd", () => {
  it("builds an Organization payload without a logo", () => {
    const org = organizationJsonLd("Home Form", "Description");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Home Form");
    expect(org.url).toBe(siteUrl);
    expect(org.description).toBe("Description");
    expect(org).not.toHaveProperty("logo");
  });
});

describe("webSiteJsonLd", () => {
  it("builds a WebSite payload with its publisher", () => {
    const org = organizationJsonLd("Home Form", "d");
    const site = webSiteJsonLd("Home Form", "d", absoluteUrl("/", "en"), org);
    expect(site["@type"]).toBe("WebSite");
    expect(site.url).toBe(`${siteUrl}/en`);
    expect(site.publisher).toBe(org);
  });
});

describe("page JSON-LD builders", () => {
  it("builds WebPage and CollectionPage payloads", () => {
    expect(webPageJsonLd("About", "d", `${siteUrl}/about`)["@type"]).toBe("WebPage");
    expect(collectionPageJsonLd("Collections", "d", `${siteUrl}/collections`)["@type"]).toBe(
      "CollectionPage",
    );
  });

  it("builds a Product payload with brand but no fabricated commerce data", () => {
    const product = productJsonLd({
      name: "Pendant Light",
      description: "d",
      url: `${siteUrl}/products/lighting/pendant-light`,
      brand: "Home Form",
    });
    expect(product["@type"]).toBe("Product");
    expect(product.brand).toEqual({ "@type": "Brand", name: "Home Form" });
    expect(product).not.toHaveProperty("offers");
    expect(product).not.toHaveProperty("price");
    expect(product).not.toHaveProperty("sku");
    expect(product).not.toHaveProperty("image");
  });

  it("adds an image to a Product payload when provided", () => {
    const product = productJsonLd({
      name: "Pendant Light",
      description: "d",
      url: `${siteUrl}/products/lighting/pendant-light`,
      image: "https://example.com/pendant.jpg",
      brand: "Home Form",
    });
    expect(product.image).toBe("https://example.com/pendant.jpg");
  });

  it("builds a dual-typed CreativeWork/WebPage payload", () => {
    const work = creativeWorkJsonLd({
      name: "Project",
      description: "d",
      url: `${siteUrl}/projects/h-istra`,
    });
    expect(work["@type"]).toEqual(["CreativeWork", "WebPage"]);
  });

  it("builds a Person payload without a placeholder website", () => {
    const person = personJsonLd({
      name: "Massimo Castagna",
      description: "d",
      url: `${siteUrl}/designers/massimo-castagna`,
    });
    expect(person["@type"]).toBe("Person");
    expect(person).not.toHaveProperty("website");
  });
});

describe("breadcrumbListJsonLd", () => {
  it("numbers items 1..n and localizes each URL", () => {
    const list = breadcrumbListJsonLd(
      [
        { name: "Products", path: "/products" },
        { name: "Lighting", path: "/products/lighting" },
      ],
      "en",
    );
    expect(list["@type"]).toBe("BreadcrumbList");

    const items = list.itemListElement as Array<{
      "@type": string;
      position: number;
      name: string;
      item: string;
    }>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[0].item).toBe(`${siteUrl}/en/products`);
    expect(items[1].item).toBe(`${siteUrl}/en/products/lighting`);
  });
});