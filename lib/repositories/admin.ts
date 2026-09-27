import { prisma } from "@/lib/db/prisma";
import { cache } from "react";

export const getProductCount = cache(async () => prisma.product.count());
export const getDesignerCount = cache(async () => prisma.designer.count());
export const getCollectionCount = cache(async () => prisma.collection.count());
export const getMaterialCount = cache(async () => prisma.material.count());
export const getFlagshipCount = cache(async () => prisma.flagship.count());
export const getProjectCount = cache(async () => prisma.project.count());

/** One point of the dashboard's orders-over-time series. */
export interface DailyOrdersPoint {
  /** UTC calendar day as `YYYY-MM-DD` (zero-filled days included). */
  date: string;
  /** Orders created on that day (`Order.createdAt`). */
  orders: number;
}

/**
 * Orders placed per day over the last `days` days — the dashboard chart's
 * only series (there is no second "device" dimension in the data, so the old
 * desktop/mobile demo split is gone).
 *
 * - Reads the real `order` table written by the checkout flow
 *   (lib/actions/checkout.ts); days without orders are zero-filled so the
 *   x-axis stays a continuous timeline instead of recharts skipping gaps.
 * - Days are keyed in UTC from `Order.createdAt`, so the series is
 *   deterministic on every render; the chart formats ticks with `timeZone:
 *   "UTC"` to match.
 * - With no orders yet the series is all zeros — the chart renders its
 *   translated empty state rather than inventing data.
 */
export const getDailyOrdersSeries = cache(
  async (days = 90): Promise<DailyOrdersPoint[]> => {
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const rows = await prisma.order.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const series: DailyOrdersPoint[] = [];
    for (let day = new Date(start); day <= now; day.setUTCDate(day.getUTCDate() + 1)) {
      const key = day.toISOString().slice(0, 10);
      series.push({ date: key, orders: counts.get(key) ?? 0 });
    }
    return series;
  },
);
