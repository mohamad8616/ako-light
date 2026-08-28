import fs from "fs";
import path from "path";

const categoriesPath = path.join(process.cwd(), "lib/data/productCategories.ts");
const prodsPath = path.join(process.cwd(), "lib/data/prods.ts");

const categoriesContent = fs.readFileSync(categoriesPath, "utf8");
const prodsContent = fs.readFileSync(prodsPath, "utf8");

const lines = categoriesContent.split("\n");
const categoryMap = {};
let currentCatIdx = 0;
let inSubCatBlock = false;
const subCatPositions = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("subCategories:")) {
    inSubCatBlock = true;
    continue;
  }
  if (inSubCatBlock && lines[i].trim() === "},") {
    inSubCatBlock = false;
    currentCatIdx++;
    continue;
  }
  if (!inSubCatBlock && lines[i].includes("slug:") && lines[i].includes("name:") && !lines[i].includes("subCategories")) {
    const catMatch = lines[i].match(/name: "([^"]+)",\s*\n\s*slug: "([^"]+)",/);
    if (catMatch) {
      categoryMap[currentCatIdx] = catMatch[2];
    }
  }
  const subMatch = lines[i].match(/\{ name: "([^"]+)", slug: "([^"]+)"/);
  if (subMatch && inSubCatBlock) {
    subCatPositions.push({
      name: subMatch[1],
      slug: subMatch[2],
      categorySlug: categoryMap[currentCatIdx] || "",
    });
  }
}

const products = subCatPositions.map((sub) => {
  const words = sub.categorySlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    name: sub.name,
    slug: sub.slug,
    category: sub.categorySlug,
    categoryLabel: words,
    heroImage: `https://picsum.photos/seed/${sub.slug}/1200/900`,
    description: `Discover the ${sub.name} collection by Henge. Italian-designed furniture crafted with exceptional materials and attention to detail.`,
    moreInfo: "Available in a range of finishes and configurations — contact your Henge representative for full technical specifications, dimensions, and lead times.",
    downloads: [
      { label: "Product Sheet", href: "#" },
      { label: "Images", href: "#" },
      { label: "2D / 3D", href: "#" },
    ],
    designer: { name: "Massimo Castagna", href: "#" },
    gallery: [
      `https://picsum.photos/seed/${sub.slug}-1/1200/900`,
      `https://picsum.photos/seed/${sub.slug}-2/1200/900`,
    ],
    related: [],
  };
});

const entries = products
  .map(
    (p, idx) => `  "${p.category}/${p.slug}": {
    name: "${p.name}",
    slug: "${p.slug}",
    category: "${p.category}",
    categoryLabel: "${p.categoryLabel}",
    heroImage: "${p.heroImage}",
    description: "${p.description}",
    moreInfo: "${p.moreInfo}",
    downloads: [
      { label: "Product Sheet", href: "#" },
      { label: "Images", href: "#" },
      { label: "2D / 3D", href: "#" },
    ],
    designer: { name: "${p.designer.name}", href: "${p.designer.href}" },
    gallery: [${p.gallery.map((g) => `"${g}"`).join(", ")}],
    related: [],
  }${idx < products.length - 1 ? "," : ""}`
  )
  .join("\n\n");

const newProductsObj = `export const products: Record<string, Product> = {
${entries}
};`;

const updatedProds = prodsContent.replace(/export const products: Record<string, Product> = \{[\s\S]*?\};/, newProductsObj);

fs.writeFileSync(prodsPath, updatedProds);
console.log("Updated prods.ts with", products.length, "placeholder products");
