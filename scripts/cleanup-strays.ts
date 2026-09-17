import "dotenv/config";
import pg from "pg";

const paths = [
  "d:\\Home form\\ako-light-cline\\d.product_placeholder",
  "d:\\Home form\\ako-light-cline\\ poolsAreUsedInMultipleSeeders",
];
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
for (const path of paths) {
  try {
    await client.query("SELECT 1");
    await import("node:fs").then((fs) => fs.promises.unlink(path));
    console.log("deleted", path);
  } catch (error) {
    console.error("cleanup failed", path, error);
  }
}
await client.end();
