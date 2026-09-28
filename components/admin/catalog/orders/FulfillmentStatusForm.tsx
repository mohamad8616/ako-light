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
 * Feedback goes through the shared `useCrudSubmit` hook, so success/failure
 * raises the same sonner toast as every other admin mutation.
 */
export function FulfillmentStatusForm({
  orderId,
  fulfillmentStatus,
}: {
  orderId: string;
  fulfillmentStatus: string;
}) {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm({
    resolver: zodResolver(orderFulfillmentFormSchema),
    values: {
      id: orderId,
      fulfillmentStatus: fulfillmentStatusSchema.safeParse(fulfillmentStatus)
        .success
        ? (fulfillmentStatus as FulfillmentStatus)
        : "unfulfilled",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run(() => updateOrderFulfillmentAction(values), {
      successMessage: t("admin.order.fulfillment.updated"),
    });
    if (result && !result.ok) applyFieldIssues(form, result);
  });

  const options = fulfillmentStatusSchema.options.map((value) => ({
    value,
    label: t(`admin.order.fulfillment.${value}`),
  }));

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
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("admin.table.saving") : t("admin.crud.save")}
        </Button>
      </form>
    </FormCard>
  );
}
