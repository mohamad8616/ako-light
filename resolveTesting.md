Fix the confirmed test-pollution source in tests/server/slug-collision.test.ts
and the concurrency pressure that causes it to time out. This is a known,
located bug — no investigation needed, just these exact changes.

1. In tests/server/slug-collision.test.ts, in the second describe block
   ("slug collision — action tier"), add a describe-level afterAll (in
   addition to the existing per-test finally blocks, which stay as-is) that
   does a broad safety-net cleanup by prefix, not exact value — this is
   what catches rows left behind if a test times out before its own
   finally block finishes running:

     afterAll(async () => {
       await prisma.product.deleteMany({
         where: { id: { startsWith: "product-collision-" } },
       });
       await prisma.productCategory.deleteMany({
         where: {
           OR: [
             { id: { startsWith: "cat-a-" } },
             { id: { startsWith: "cat-b-" } },
             { id: { startsWith: "cat-product-" } },
           ],
         },
       });
       await prisma.fabricItem.deleteMany({
         where: { id: { startsWith: "fab-" } },
       });
     });

   Place this alongside (not replacing) the existing prisma.$disconnect()
   afterAll already in that describe block — both should run.

2. In vitest.config.ts, add `hookTimeout: 60_000` and `testTimeout: 60_000`
   (up from the current 30_000) to the `server` project specifically —
   this file's action-tier tests each do 2-3 sequential real DB writes,
   which is more round-trips than a typical repository test, so it's more
   exposed to connection-pressure delays. Leave the `integration` project's
   timeouts at 30_000 unless the same analysis below shows it needs the
   same treatment.

3. Confirm whether `integration` and `server` currently run concurrently
   against the same dev database: run `npx vitest run --project integration
   --project server` and, separately, `npx vitest run --project integration`
   then `npx vitest run --project server` back to back — if the combined
   run is measurably slower per-test or shows connection errors that the
   separate runs don't, that confirms concurrent cross-project pressure.
   If confirmed, add `fileParallelism: false` scoped to just those two
   projects' `test` blocks in vitest.config.ts (not the `unit` project,
   which stays fast and fully parallel).

4. Run this exact verification query after a full `pnpm test` run, not a
   general row count — check the specific prefixes this file uses:

     await prisma.productCategory.count({
       where: { id: { in: [
         { startsWith: "cat-a-" }, { startsWith: "cat-b-" },
         { startsWith: "cat-product-" }
       ]}}
     })
     // and the same shape for product ("product-collision-") and
     // fabricItem ("fab-")

   All three must be exactly 0 after every run. Run the full suite 8
   times consecutively and report the count of these specific prefixed
   rows after each run (not just overall pass/fail) — that's the real
   proof this is fixed, since the assertion counts (11 categories, 10
   fabrics, etc.) are a proxy for this and can mask a small leak if the
   seeded baseline also happens to shift for an unrelated reason.

5. Run npx tsc --noEmit and the full pnpm test suite once more after all
   of the above. Report the 8-run burst results with the exact prefix
   counts per run, plus overall pass/fail counts.