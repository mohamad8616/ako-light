/** Applies all schema.prisma edits for the FK migration + SlugHistory model. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("prisma/schema.prisma");
let src = readFileSync(file, "utf8");

// 1. Global: change all FK references from slug to id (5 instances)
src = src.replace(/references: \[slug\]/g, "references: [id]");

// 2. Product model: update categoryId/designerId comments
src = src.replace(
  '/// ProductCategory.slug ("coffee-tables", ...) \u2014 see FK convention above.\n   categoryId    String\n   /// Designer.slug derived from Product.designer.href; null when no designer\n   /// record matches the href.\n   designerId    String?',
  '   /// ProductCategory.id \u2014 the FK column holds the parent\'s id (not slug);\n   /// see FK convention note above the catalog models. The URL route param is\n   /// a category slug, resolved to this id by the repository layer.\n   categoryId    String\n   /// Designer.id \u2014 derived from Product.designer.href; null when no designer\n   /// record matches the href. References Designer.id (not slug).\n   designerId    String?',
);

// 3. ProductImage: update the product FK comment
src = src.replace(
  "/// Product.slug \u2014 the image belongs to this product.\n   productId String\n   product   Product  @relation",
  '   /// Product.id \u2014 the image belongs to this product (id-based FK; slug is the\n   /// route handle, not the referential key \u2014 see header note above catalog).\n   productId String\n   product   Product  @relation',
);

// 4. ProjectProduct: update the join-table comment
src = src.replace(
  "/// Project.slug / Product.slug \u2014 repo FK convention (see header note).",
  "/// Project.id / Product.id \u2014 id-based FKs (see header note above catalog).",
);

// 5. Append SlugHistory model at the end of the file
const slugHistoryModel =
  "\n// ---------------------------------------------------------------------------\n" +
  "// Slug rename redirect history.\n" +
  "//\n" +
  "// When an entity\'s slug changes (admin CRUD, Step 7), recordSlugChange()\n" +
  "// inserts a row here *before* the slug update runs. Public dynamic routes\n" +
  "// then look up the old slug here on a 404 and 301-redirect to the current URL,\n" +
  "// so inbound links / bookmarks don\'t break.\n" +
  "// ---------------------------------------------------------------------------\n" +
  "model SlugHistory {\n" +
  "  id        String   @id @default(uuid())\n" +
  "  modelType String\n" +
  "  entityId  String\n" +
  "  oldSlug   String\n" +
  "  createdAt DateTime @default(now())\n" +
  "\n" +
  "  @@unique([modelType, oldSlug])\n" +
  "  @@index([entityId])\n" +
  "  @@map(\"slug_history\")\n" +
  "}\n";

if (!src.includes("model SlugHistory")) {
  src += slugHistoryModel;
}

writeFileSync(file, src);
console.log("Schema edits applied.");


