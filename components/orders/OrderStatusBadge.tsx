/**
 * Order status chips.
 *
 * A SERVER component (no `"use client"`): the order pages are fully server
 * rendered, so these need no interactivity and must not drag a client boundary
 * into them. Used by both the history list and the detail page so the two
 * cannot drift.
 */

export type StatusTone = "positive" | "stopped" | "neutral";

/**
 * Payment status → tone. Only `paid` is positive; `failed`/`cancelled` read as
 * stopped; `pending` is simply not-yet, which is not a failure.
 */
export function paymentStatusTone(status: string): StatusTone {
  if (status === "paid") return "positive";
  if (status === "failed" || status === "cancelled") return "stopped";
  return "neutral";
}

/** Fulfilment status → tone. Cancelled is stopped; delivered is positive. */
export function fulfillmentStatusTone(status: string): StatusTone {
  if (status === "delivered") return "positive";
  if (status === "cancelled") return "stopped";
  return "neutral";
}

const TONE_CLASS: Record<StatusTone, string> = {
  positive: "border-emerald-600 text-emerald-700",
  stopped: "border-red-600 text-red-700",
  neutral: "border-stone-300 text-stone-600",
};

export function OrderStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}
