import { prisma } from "@/lib/db/prisma";
import { claimPendingOrder } from "@/lib/repositories/orders";
import {
  readStaleOrderConfig,
  staleOrderCutoff,
  type StaleOrderConfig,
} from "./stale-config";

/** Operational counts only — no customer, payment or order contents. */
export interface StaleOrderCleanupResult {
  scanned: number;
  transitioned: number;
  skipped: number;
  errors: number;
}

/**
 * One bounded cron invocation. A later invocation picks up remaining rows.
 *
 * IMPORTANT: finding a row is NOT ownership of its transition. The only
 * authority to release stock comes from `claimPendingOrder`, whose guarded
 * UPDATE checks status = pending (and, for this call, createdAt < cutoff and
 * fulfillmentStatus = unfulfilled). Only the winner executes
 * `releaseOrderStock` in the SAME transaction. A callback, admin transition or
 * another cron can win the race; that yields `changed: false` / `skipped` and
 * NEVER credits stock a second time.
 *
 * Selection fetches only IDs; no customer/payment data enters logs or output.
 * Errors on individual orders are counted and logged as safe categories. The
 * rest of the bounded batch still runs; a failure to select the batch itself
 * bubbles up so the route can report a generic 500 rather than a false success.
 *
 * CANCELLED ORDERS ARE OUT OF SCOPE, BY DESIGN. An admin cancelling an unpaid
 * order releases its reservation itself (`updateOrderFulfillmentStatus`), so
 * this sweep must never touch it — and it cannot: both the selection
 * (`fulfillmentStatus: "unfulfilled"`) and the final guarded transition
 * (`claimPendingOrder` excludes `fulfillmentStatus: "cancelled"`) require an
 * UNFULFILLED order. That is what keeps the release to exactly once: the sweep
 * covers only orders that are still holding their reservation.
 */
export async function cleanupStalePendingOrders({
  now = new Date(),
  config = readStaleOrderConfig(),
}: {
  now?: Date;
  config?: StaleOrderConfig;
} = {}): Promise<StaleOrderCleanupResult> {
  const cutoff = staleOrderCutoff(now, config.expirationMinutes);
  if (!Number.isSafeInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 100) {
    throw new Error("Invalid stale-order cleanup batch size");
  }

  const candidates = await prisma.order.findMany({
    where: {
      status: "pending",
      fulfillmentStatus: "unfulfilled",
      createdAt: { lt: cutoff },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: config.batchSize,
    select: { id: true },
  });

  const result: StaleOrderCleanupResult = {
    scanned: candidates.length,
    transitioned: 0,
    skipped: 0,
    errors: 0,
  };

  for (const { id } of candidates) {
    try {
      const { changed } = await claimPendingOrder({
        orderId: id,
        status: "failed",
        staleBefore: cutoff,
        txOptions: { maxWait: 30_000, timeout: 30_000 },
      });
      if (changed) result.transitioned += 1;
      else result.skipped += 1;
    } catch (error) {
      result.errors += 1;
      // Do not log the raw error: driver errors may include SQL parameters,
      // payment metadata or customer fields. A safe category + order ID is
      // sufficient to locate the failed row for manual investigation.
      console.error("[orders-cleanup] order failed", {
        orderId: id,
        category: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return result;
}
