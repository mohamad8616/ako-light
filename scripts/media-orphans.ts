import "dotenv/config";
import { del, list } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Pass 13.5E — orphan detection for the direct-upload path.
 *
 * WHY THIS EXISTS
 *
 * A direct upload is two steps that cannot be committed together: the browser
 * writes the object, then an authorised action writes the `Media` row. If the
 * second step never happens — the tab was closed, the network dropped, the
 * action failed — the object is in the store with nothing pointing at it.
 *
 * The plan asks for "the simplest reliable solution" and explicitly rules out
 * building a background system, so this is a MANUAL SWEEP rather than a cron:
 * it lists every object under the `media/` prefix and reports the ones no
 * `Media` row owns. Dry run by default; `APPLY=1` deletes them.
 *
 * DELETING IS SAFE HERE precisely because the check is the same one the delete
 * guard uses: an object is only ever removed when NO `Media` row holds its
 * `storageKey`. A file that is still referenced cannot be touched by this script.
 *
 * It deliberately does NOT scan the legacy `admin/` prefix: those objects are
 * owned by the catalog URL columns, not by `Media`, so "no Media row" would be
 * the normal state and the sweep would delete live files.
 *
 * Run with:
 *   node_modules/.bin/tsx scripts/media-orphans.ts          # report
 *   APPLY=1 node_modules/.bin/tsx scripts/media-orphans.ts  # delete
 */
const APPLY = process.env.APPLY === "1";

/** Everything this app creates through the media library lives here. */
const MEDIA_PREFIX = "media/";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set — cannot list the store.");
  await prisma.$disconnect();
  process.exit(1);
}

/** Every object pathname in the store under the media prefix. */
const objectKeys: string[] = [];
let cursor: string | undefined;

do {
  const page = await list({ prefix: MEDIA_PREFIX, cursor, token });
  for (const blob of page.blobs) objectKeys.push(blob.pathname);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

// One query for every owned key — the whole point is to avoid a per-object
// round trip against the remote pooler.
const owned = new Set(
  (
    await prisma.media.findMany({
      where: { storageKey: { in: objectKeys } },
      select: { storageKey: true },
    })
  ).map((row) => row.storageKey),
);

const orphans = objectKeys.filter((key) => !owned.has(key));

console.log(`objects under "${MEDIA_PREFIX}": ${objectKeys.length}`);
console.log(`owned by a Media row:            ${owned.size}`);
console.log(`ORPHANS:                         ${orphans.length}\n`);

for (const key of orphans) console.log(`  ${key}`);

if (orphans.length === 0) {
  console.log("\nnothing to clean.");
  await prisma.$disconnect();
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDRY RUN — re-run with APPLY=1 to delete these objects.");
  await prisma.$disconnect();
  process.exit(0);
}

await del(orphans, { token });
console.log(`\ndeleted ${orphans.length} orphaned object(s).`);

await prisma.$disconnect();
