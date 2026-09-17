import "dotenv/config";
import pg from "pg";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync(new URL("../prisma/migrations/20260916220000_catalog_fk_additive_column_swap/migration.sql", import.meta.url), "utf8").replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
const tables = ["product_category", "designer", "product", "project", "product_image", "project_product"];
const relations = [
  ["product", "categoryId", "product_category"],
  ["product", "designerId", "designer"],
  ["product_image", "productId", "product"],
  ["project_product", "projectId", "project"],
  ["project_product", "productId", "product"],
];
await client.connect();
try {
  for (const target of ["slug", "id"]) {
    await client.query("BEGIN");
    try {
      const schema = `fk_test_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      for (const table of tables) {
        await client.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
        await client.query(`INSERT INTO "${schema}"."${table}" SELECT * FROM public."${table}"`);
      }
      if (target === "slug") {
        // Deliberately diverge every parent PK while the child values remain slugs.
        for (const table of tables.slice(0, 4)) {
          await client.query(`UPDATE "${table}" SET id = 'test-id-' || id`);
        }
      }
      for (const [child, column, parent] of relations) {
        await client.query(`ALTER TABLE "${child}" ADD CONSTRAINT "${child}_${column}_fkey" FOREIGN KEY ("${column}") REFERENCES "${parent}"("${target}")`);
      }
      const before = await Promise.all(tables.map(async table => (await client.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n));
      await client.query(sql);
      const after = await Promise.all(tables.map(async table => (await client.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n));
      assert.deepEqual(after, before);
      for (const [child, column, parent] of relations) {
        const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${child}" c LEFT JOIN "${parent}" p ON c."${column}" = p.id WHERE c."${column}" IS NOT NULL AND p.id IS NULL`);
        assert.equal(rows[0].n, 0);
      }
      console.log(`PASS ${target}-target backfill (all rows preserved):`, before, "->", after);
    } finally {
      // Includes the isolated schema and every copied row; public is never modified.
      await client.query("ROLLBACK");
    }
  }
} finally {
  await client.end();
}
