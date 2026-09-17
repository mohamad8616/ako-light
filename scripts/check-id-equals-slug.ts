import "dotenv/config";
import { prisma } from "../lib/db/prisma";

const checks: [string, string][] = [
  ["product_category", "slug"],
  ["designer", "slug"],
  ["product", "slug"],
  ["collection", "slug"],
  ["material", "slug"],
  ["flagship", "slug"],
  ["project", "slug"],
];

async function main(): Promise<void> {
  for (const [tbl, col] of checks) {
    const total = (
      await prisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT COUNT(*)::int as count FROM "${tbl}"`,
      )
    )[0].count;
    const matching = (
      await prisma.$queryRawUnsafe<{ count: string }[]>(
                  `SELECT COUNT(*)::int as count FROM "${tbl}" WHERE id = ${col}`,
      )
    )[0].count;
    console.log(`${tbl}: total=${total} id_eq_${col}=${matching}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
