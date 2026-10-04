-- Pass 15 — one new fulfillment state, so the lifecycle can express
-- "being prepared" separately from "not yet shipped".
--
-- PURELY ADDITIVE: `ALTER TYPE ... ADD VALUE` appends a label to the enum. No
-- row changes, no column changes, no table rewrite, and no existing value is
-- touched — every order that was `unfulfilled` stays `unfulfilled`.
--
-- Positioned BEFORE 'shipped' rather than appended so the enum reads in
-- lifecycle order, which makes the transition rules in lib/orders/lifecycle.ts
-- legible against the type. (`ALTER TYPE ... ADD VALUE ... BEFORE` is supported
-- on PostgreSQL 10+; Neon runs far newer.)
--
-- Note: Postgres cannot add an enum value inside a transaction that then USES
-- it, which is why this migration contains nothing but the ALTER.

-- AlterEnum
ALTER TYPE "FulfillmentStatus" ADD VALUE 'processing' BEFORE 'shipped';
