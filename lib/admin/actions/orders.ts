"use server";

/**
 * Server actions for the orders admin section.
 *
 * There is exactly ONE writable field here — `Order.fulfillmentStatus`. The
 * payment status (`Order.status`) has no action in this module by design: it is
 * written only by ZarinPal's `verify()` callback, so no admin UI can ever mark
 * an unpaid order as paid (see the section note in lib/admin/schemas/order.ts).
 *
 * Same contract as every other admin action: re-run `requireAdminAccess()`
 * (server functions are reachable by direct POST), re-validate the payload with
 * the SAME zod schema the client uses, and map failures into `ActionResult`.
 * All persistence goes through lib/repositories/orders.ts — no Prisma here.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  orderFulfillmentFormSchema,
  type OrderFulfillmentFormValues,
} from "@/lib/admin/schemas/order";
import {
  InvalidOrderTransitionError,
  updateOrderFulfillmentStatus,
} from "@/lib/repositories/orders";

/**
 * Updates an order's fulfillment status. Payment status is intentionally not
 * accepted — it is not part of the schema, so a forged payload cannot smuggle
 * it in either.
 *
 * The lifecycle rules are enforced in the repository, not here and not in the
 * form: `updateOrderFulfillmentStatus` re-reads the order's CURRENT state inside
 * a transaction and refuses anything the lifecycle does not permit (walking
 * backwards, leaving a terminal state, or starting fulfilment on an order that
 * has not been paid). A refusal is reported as a field-level error so the admin
 * sees why the change did not stick.
 */
export async function updateOrderFulfillmentAction(
  input: OrderFulfillmentFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = orderFulfillmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateOrderFulfillmentStatus(
      parsed.data.id,
      parsed.data.fulfillmentStatus,
    );
    revalidateCatalog("orders", { id: parsed.data.id });
    return actionOk(undefined);
  } catch (error) {
    if (error instanceof InvalidOrderTransitionError) {
      // The message comes from `admin.error.invalidTransition` via the shared
      // code→copy mapping, so no internals are echoed to the admin.
      return actionFail("invalidTransition", [
        { field: "fulfillmentStatus", code: "invalidTransition" },
      ]);
    }
    return toActionResult(error);
  }
}
