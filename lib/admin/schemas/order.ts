import { z } from "zod";
import { idSchema } from "./common";

/**
 * The order section's form rules.
 *
 * Only ONE field of an order is admin-writable: its fulfillment status. The
 * payment status (`Order.status`) is deliberately absent from every schema in
 * this module — it is written exclusively by ZarinPal's `verify()` callback
 * (app/[locale]/(site)/checkout/callback/page.tsx). If an admin could submit it
 * here, anyone with dashboard access could mark an unpaid order as paid.
 *
 * The enum is spelled out rather than imported from the generated Prisma client:
 * this module is imported by a client component (the detail form), and the
 * generated client pulls node builtins at module top level (see
 * lib/admin/result-server.ts). Keep it 1:1 with `FulfillmentStatus` in
 * prisma/schema.prisma.
 */
export const fulfillmentStatusSchema = z.enum([
  "unfulfilled",
  "shipped",
  "delivered",
  "cancelled",
]);

export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;

export const orderFulfillmentFormSchema = z.object({
  /** `Order.id` (uuid). */
  id: idSchema,
  fulfillmentStatus: fulfillmentStatusSchema,
});

export type OrderFulfillmentFormValues = z.infer<
  typeof orderFulfillmentFormSchema
>;
