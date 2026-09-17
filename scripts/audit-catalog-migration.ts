import "dotenv/config";
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const path = new URL("../prisma/migrations/20260916204550_convert_catalog_fks_to_id/migration.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  console.log("FILE", { checksum: createHash("sha256").update(sql).digest("hex"), addsColumns: /ADD COLUMN/i.test(sql), dropsColumns: /DROP COLUMN/i.test(sql) });
  console.log("MIGRATIONS", (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at')).rows);
  console.log("FKS", (await client.query("SELECT conrelid::regclass::text AS child, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY conname")).rows);
  for (const table of ["product_category", "designer", "product", "collection", "material", "flagship", "project", "product_image", "project_product"]) {
    const hasSlug = !["product_image", "project_product"].includes(table);
    console.log(table, (await client.query(`SELECT count(*)::int AS rows${hasSlug ? ', count(*) FILTER (WHERE id <> slug)::int AS drifted' : ''} FROM "${table}"`)).rows[0]);
  }
} finally {
  await client.end();
}
