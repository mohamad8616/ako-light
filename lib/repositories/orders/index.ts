/**
 * Order reads, the guarded fulfillment transition, stock reservation and
 * pending-order settlement.
 *
 * STRUCTURE
 *
 * This was one 669-line module covering the admin reads, the guarded
 * fulfillment transition, the customer-facing reads, the stock-reservation pair
 * and the single writer of a terminal payment status. They are now separate
 * modules and this barrel re-exports the union, so importers keep the
 * specifier they already use (`@/lib/repositories/orders`):
 *
 *   ./admin-read      dashboard row + edit-form DTOs (getOrderAdminRows/Detail)
 *   ./customer-read   customer order reads (getMyOrders / getMyOrder)
 *   ./fulfillment     updateOrderFulfillmentStatus + InvalidOrderTransitionError
 *   ./stock           claimProductStock / releaseOrderStock
 *   ./settle          claimPendingOrder — the ONLY writer of `paid` / `failed`
 *
 * The split is by RUNTIME CONSUMER, not by line count: the customer reads are
 * on the visitor's path, while `./admin-read` and `./fulfillment` are reached
 * only from the authenticated dashboard, and `./stock` + `./settle` are the
 * checkout/payment axis shared by the checkout action, the gateway settlement
 * and the stale-pending sweep. Keeping them in separate modules means a change
 * to one axis cannot accidentally alter what another axis imports.
 */
export { getOrderAdminDetail, getOrderAdminRows } from "./admin-read";
export type {
  OrderAdminDetail,
  OrderAdminRow,
  OrderRow,
} from "./admin-read";

export { getMyOrder, getMyOrders } from "./customer-read";
export type {
  CustomerOrderDetail,
  CustomerOrderLine,
  CustomerOrderSummary,
} from "./customer-read";

export {
  InvalidOrderTransitionError,
  updateOrderFulfillmentStatus,
} from "./fulfillment";

export { claimPendingOrder } from "./settle";
export { claimProductStock, releaseOrderStock } from "./stock";
