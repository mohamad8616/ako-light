"use client";

import { FormCard } from "@/components/admin/catalog/fields/form";
import { SelectField } from "@/components/admin/catalog/fields/SelectField";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button } from "@/components/ui/button";
import { updateOrderFulfillmentAction } from "@/lib/admin/actions/orders";
import {
  fulfillmentStatusSchema,
  orderFulfillmentFormSchema,
  type FulfillmentStatus,
} from "@/lib/admin/schemas/order";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  checkFulfillmentTransition,
  FULFILLMENT_STATUSES,
  isTerminalFulfillmentStatus,
  type OrderPaymentStatus,
} from "@/lib/orders/lifecycle";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

/**
 * The order detail's ONE editable control: the fulfillment-status dropdown.
 *
 * Payment status is not a field here — it is rendered read-only by the server
 * page, because it may only ever change through ZarinPal's `verify()` callback
 * (see lib/admin/schemas/order.ts). This component cannot submit it either: the
 * form values and the server schema both contain only
 * `{ id, fulfillmentStatus }`.
 *
 * THE DROPDOWN OFFERS ONLY LEGAL MOVES. The lifecycle rules live in
 * lib/orders/lifecycle.ts and are enforced server-side in
 * `updateOrderFulfillmentStatus` — a server action is reachable by direct POST,
 * so the form cannot be the guard. Filtering the options here is purely so an
 * admin is never offered a choice that would come back refused.
 *
 * Feedback goes through the shared `useCrudSubmit` hook, so success/failure
 * raises the same sonner toast as every other admin mutation.
 */
export function FulfillmentStatusForm({
  orderId,
  fulfillmentStatus,
  paymentStatus,
}: {
  orderId: string;
  fulfillmentStatus: string;
  /** `Order.status` — the payment axis. Gates everything except cancelling. */
  paymentStatus: OrderPaymentStatus;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const current: FulfillmentStatus = fulfillmentStatusSchema.safeParse(
    fulfillmentStatus,
  ).success
    ? (fulfillmentStatus as FulfillmentStatus)
    : "unfulfilled";

  const form = useForm({
    resolver: zodResolver(orderFulfillmentFormSchema),
    values: { id: orderId, fulfillmentStatus: current },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateOrderFulfillmentAction(values), {
      successMessage: t("admin.order.fulfillment.updated"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  // The current state is always kept so the select has a valid value; every
  // other entry is a transition the lifecycle actually permits.
  const options = FULFILLMENT_STATUSES.filter(
    (value) =>
      value === current ||
      checkFulfillmentTransition(current, value, paymentStatus).ok,
  ).map((value) => ({
    value,
    label: t(`admin.order.fulfillment.${value}`),
  }));

  const terminal = isTerminalFulfillmentStatus(current);
  // A terminal order (or one with no legal next step) has exactly one option
  // left, so the control is effectively read-only and there is nothing to
  // submit. The select itself is left enabled — it only ever offers that one
  // value, and the server refuses anything else regardless.
  const onlyChoice = options.length <= 1;

  return (
    <FormCard
      title={t("admin.order.card.fulfillment")}
      description={t("admin.order.fulfillment.hint")}
    >
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <FormProvider {...form}>
          <SelectField
            name="fulfillmentStatus"
            label={t("admin.order.col.fulfillmentStatus")}
            options={options}
            className="min-w-56 flex-1"
          />
        </FormProvider>
        <Button
          type="submit"
          size="sm"
          disabled={pending || terminal || onlyChoice}
        >
          {pending ? t("admin.table.saving") : t("admin.crud.save")}
        </Button>
      </form>
    </FormCard>
  );
}
