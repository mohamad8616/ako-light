import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("prisma/schema.prisma");
let src = readFileSync(file, "utf8");

const fixes: [string, string][] = [
  // Product model: categoryId/designerId comments
  [
    '/// ProductCategory.slug ("coffee-tables", ...) \u2014 see FK convention above.',
    "/// ProductCategory.id \u2014 the FK column holds the parent's `id`\n   /// (not slug); see FK convention note above the catalog models.",
  ],
  [
    "/// Designer.slug derived from Product.designer.href; null when no designer",
    "/// Designer.id \u2014 derived from Product.designer.href; null when no designer",
  ],
  [
    "/// record matches the href.\n   designerId    String?",
    "/// record matches the href. References Designer.id (not slug).",
  ],
  // ProductImage: product FK comment
  [
    "/// Product.slug \u2014 the image belongs to this product.",
    "/// Product.id \u2014 the image belongs to this product (id-based FK; slug\n   /// is the route handle, not the referential key).",
  ],
];

let count = 0;
for (const [oldStr, newStr] of fixes) {
  if (src.includes(oldStr)) {
    src = src.replace(oldStr, newStr);
    count++;
  } else {
    console.log(`NOT FOUND: ${oldStr}`);
  }
}

writeFileSync(file, src);
console.log(`Applied ${count}/${fixes.length} comment fixes.`);
