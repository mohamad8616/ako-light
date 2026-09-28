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
import { updateOrderFulfillmentStatus } from "@/lib/repositories/orders";

/**
 * Updates an order's fulfillment status. Payment status is intentionally not
 * accepted — it is not part of the schema, so a forged payload cannot smuggle
 * it in either.
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
    return toActionResult(error);
  }
}
