import {
  deriveTimeline,
  type FulfillmentStatus,
  type OrderPaymentStatus,
  type TimelineStepKey,
} from "@/lib/orders/lifecycle";
import { OrderStatusBadge, paymentStatusTone } from "./OrderStatusBadge";

/**
 * The customer's progress view for one order.
 *
 * A SERVER component, and deliberately NOT a history: the schema stores no
 * status-change events, so there are no per-step timestamps to show. Inventing
 * them would be a lie, so a step is simply reached or not — derived from the two
 * status columns by `deriveTimeline` (lib/orders/lifecycle.ts), which is also
 * what the tests exercise directly.
 *
 * A cancelled or failed order shows its status chip instead of a progress bar
 * that quietly stopped halfway, so the customer is told what happened.
 */
export function OrderTimeline({
  paymentStatus,
  fulfillmentStatus,
  labels,
  stoppedLabel,
}: {
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  /** `orders.timeline.<key>` copy for the active locale. */
  labels: Record<TimelineStepKey, string>;
  /** Shown in place of the steps when the order will not progress. */
  stoppedLabel: string | null;
}) {
  if (stoppedLabel) {
    return (
      <div className="flex items-center gap-3">
        <OrderStatusBadge
          label={stoppedLabel}
          tone={paymentStatusTone(paymentStatus)}
        />
      </div>
    );
  }

  const steps = deriveTimeline(paymentStatus, fulfillmentStatus);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2"
        >
          <div className="flex items-center gap-3 sm:w-full">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                step.done
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-300 bg-white text-stone-400"
              }`}
            >
              {index + 1}
            </span>
            {/* The connector, drawn between dots on wide screens only. */}
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`hidden h-px flex-1 sm:block ${
                  steps[index + 1].done ? "bg-stone-950" : "bg-stone-200"
                }`}
              />
            ) : null}
          </div>
          <span
            className={`pb-4 text-sm sm:pb-0 ${
              step.done ? "font-medium text-stone-950" : "text-stone-500"
            }`}
          >
            {labels[step.key]}
          </span>
        </li>
      ))}
    </ol>
  );
}
