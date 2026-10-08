import "dotenv/config";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { createLiaraS3Client, liaraStorage } from "@/lib/media/storage/liara";
import { readLiaraConfig } from "@/lib/media/storage/liara-config";

/**
 * Pass 13.5E — orphan detection for the direct-upload path.
 *
 * WHY THIS EXISTS
 *
 * A direct upload is two steps that cannot be committed together: the browser
 * writes the object, then an authorised action writes the `Media` row. If the
 * second step never happens — the tab was closed, the network dropped, the
 * action failed — the object is in the bucket with nothing pointing at it.
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
 * It talks to the bucket through the SAME provider the app writes with — it
 * used to use Vercel Blob's `list`/`del`, which could not see Liara objects at
 * all and would have reported "nothing to clean" forever.
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

let config;
try {
  config = readLiaraConfig();
} catch {
  console.error(
    "Liara storage is not configured — set LIARA_ENDPOINT, LIARA_BUCKET_NAME, " +
      "LIARA_ACCESS_KEY and LIARA_SECRET_KEY before running this sweep.",
  );
  await prisma.$disconnect();
  process.exit(1);
}

const client = createLiaraS3Client(config);

/** Every object key in the bucket under the media prefix. */
const objectKeys: string[] = [];
let continuationToken: string | undefined;

do {
  const page = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: MEDIA_PREFIX,
      ContinuationToken: continuationToken,
    }),
  );
  for (const object of page.Contents ?? []) {
    if (object.Key) objectKeys.push(object.Key);
  }
  continuationToken = page.IsTruncated
    ? page.NextContinuationToken
    : undefined;
} while (continuationToken);

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

await liaraStorage.delete(orphans);
console.log(`\ndeleted ${orphans.length} orphaned object(s).`);

await prisma.$disconnect();
