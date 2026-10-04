-- Pass 14 — duplicate-checkout guard.
--
-- PURELY ADDITIVE and non-blocking: one NULLABLE column plus one unique index.
-- No DROP, no data change, and no existing column is touched, so the live site
-- keeps working throughout. The `order` table is not rewritten — adding a
-- nullable column and an index over it are online operations in Postgres.
--
-- WHY A UNIQUE INDEX AND NOT AN APPLICATION CHECK
--
-- The threat is two requests arriving at once: a double-clicked submit, a
-- browser retry, or a replayed POST. An application-level "has this order
-- already been created?" read-then-insert cannot stop that — both transactions
-- read no existing order and both insert. The uniqueness has to be enforced by
-- the database, where the second INSERT is rejected by the index instead of
-- silently succeeding. `createPendingOrder` catches that unique violation and
-- returns the order the first request created.
--
-- WHY NULLABLE
--
-- `idempotencyKey` is only meaningful for checkouts that opted in by sending a
-- key. Keeping it NULL-able means pre-existing rows stay valid and any future
-- non-idempotent writer is unaffected — Postgres permits many NULLs inside a
-- unique index, so only non-null duplicates collide.

-- AlterTable
ALTER TABLE "order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "order_idempotencyKey_key" ON "order"("idempotencyKey");
