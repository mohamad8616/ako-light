import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function main(): Promise<void> {
  console.log("=== Row counts ===");
  const tables = ["product_category", "designer", "product", "collection", "material", "flagship", "project", "product_image", "project_product"];
  for (const t of tables) {
    const r = await prisma.$queryRawUnsafe<{ count: string }[]>(`SELECT COUNT(*)::int as count FROM "${t}"`);
    console.log(`${t}: ${r[0].count}`);
  }

  console.log("\n=== FK integrity (orphan counts, should be 0) ===");
  const checks = [
    ["product.categoryId", `SELECT COUNT(*)::int as count FROM "product" p LEFT JOIN "product_category" pc ON p."categoryId" = pc.id WHERE pc.id IS NULL`],
    ["product.designerId", `SELECT COUNT(*)::int as count FROM "product" p LEFT JOIN "designer" d ON p."designerId" = d.id WHERE p."designerId" IS NOT NULL AND d.id IS NULL`],
    ["product_image.productId", `SELECT COUNT(*)::int as count FROM "product_image" pi LEFT JOIN "product" p ON pi."productId" = p.id WHERE p.id IS NULL`],
    ["project_product.projectId", `SELECT COUNT(*)::int as count FROM "project_product" pp LEFT JOIN "project" pj ON pp."projectId" = pj.id WHERE pj.id IS NULL`],
    ["project_product.productId", `SELECT COUNT(*)::int as count FROM "project_product" pp LEFT JOIN "product" p ON pp."productId" = p.id WHERE p.id IS NULL`],
  ];
  for (const [name, q] of checks) {
    const r = await prisma.$queryRawUnsafe<{ count: string }[]>(q);
    console.log(`${name} orphans: ${r[0].count}`);
  }

  console.log(`\nslug_history rows: ${await prisma.slugHistory.count()}`);

  console.log("\n=== id == slug confirmation ===");
  const slugTables = ["product_category", "designer", "product", "collection", "material", "flagship", "project"];
  for (const t of slugTables) {
    const total = (
      await prisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT COUNT(*)::int as count FROM "${t}"`,
      )
    )[0].count;
    const match = (
      await prisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT COUNT(*)::int as count FROM "${t}" WHERE id = "slug"`,
      )
    )[0].count;
    console.log(`${t}: total=${total} id_eq_slug=${match}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
