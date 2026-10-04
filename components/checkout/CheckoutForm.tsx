"use client";

import {
  createPendingOrder,
  type CheckoutActionResult,
} from "@/lib/actions/checkout";
import { useCart, useCartHydrated, useCartTotal } from "@/lib/cart/store";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatProductPrice } from "@/lib/i18n/price";
import { useState } from "react";

/**
 * A fresh duplicate-checkout key. Generated in the browser because only the
 * browser knows whether two submissions are the SAME attempt (a double-click,
 * a retry) or two genuinely different ones.
 *
 * `crypto.randomUUID` is unavailable in non-secure contexts, so there is a
 * fallback — the key only has to be unique per attempt, not unguessable.
 */
function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutForm() {
  const { dir, lang } = useLanguage();
  const items = useCart((state) => state.items);
  const hydrated = useCartHydrated();
  const total = useCartTotal();
  const [form, setForm] = useState({
    recipientName: "",
    phone: "",
    addressLine: "",
    city: "",
    postalCode: "",
  });
  const [result, setResult] = useState<CheckoutActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Duplicate-checkout guard (Pass 14). One key per checkout ATTEMPT: a
  // double-submitted form re-sends the same value, so the server returns the
  // order it already created instead of making a second one.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  // …but a key must only ever describe ONE basket. If the cart changes, a new
  // key is minted, otherwise a genuine second order for different items would
  // be deduplicated against the first. Render-phase reset, matching the pattern
  // in ProductModal — no effect, so there is no stale-key window.
  const cartSignature = items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join("|");
  const [lastCartSignature, setLastCartSignature] = useState(cartSignature);
  if (cartSignature !== lastCartSignature) {
    setLastCartSignature(cartSignature);
    setIdempotencyKey(newIdempotencyKey());
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Second line of defence behind the disabled button: a submit that fires
    // while one is already in flight would otherwise send a second request.
    if (submitting) return;
    setSubmitting(true);
    setResult(null);

    const response = await createPendingOrder({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      idempotencyKey,
      ...form,
    });

    setSubmitting(false);
    setResult(response);
    if (response.ok) {
      window.location.assign(response.redirectUrl);
    }
  }

  if (!hydrated) {
    return <p className="text-sm text-stone-500">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="border border-stone-200 p-6 text-sm text-stone-600">
        Your cart is empty. Add a product before checking out.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      dir={dir}
      className="grid gap-8 lg:grid-cols-[1fr_22rem]"
    >
      <div className="flex flex-col gap-5">
        <Field
          label="Recipient name"
          value={form.recipientName}
          onChange={(value) => update("recipientName", value)}
          required
        />
        <Field
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(value) => update("phone", value)}
          required
        />
        <Field
          label="Address"
          value={form.addressLine}
          onChange={(value) => update("addressLine", value)}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="City"
            value={form.city}
            onChange={(value) => update("city", value)}
            required
          />
          <Field
            label="Postal code"
            value={form.postalCode}
            onChange={(value) => update("postalCode", value)}
            required
          />
        </div>
        {result && !result.ok ? (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{result.error}</p>
            {result.affectedItems?.length ? (
              <ul className="mt-2 list-disc ps-5">
                {result.affectedItems.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-fit bg-stone-950 px-8 py-3 text-sm tracking-wide text-white uppercase transition hover:bg-stone-800 disabled:opacity-50"
        >
          {submitting ? "Checking availability…" : "Create order"}
        </button>
      </div>

      <aside className="h-fit border-stone-200 p-6">
        <h2 className="text-sm font-medium tracking-wide uppercase">
          Order summary
        </h2>
        <div className="mt-5 flex-col gap-3 text-sm text-stone-600">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between gap-4">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatProductPrice(item, lang, item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between border-t border-stone-200 pt-4 text-sm font-medium text-stone-950">
          <span>Total</span>
          <span>
            {formatProductPrice(
              {
                priceEur: items.reduce(
                  (sum, item) => sum + item.priceEur * item.quantity,
                  0,
                ),
                priceToman: total,
              },
              lang,
            )}
          </span>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-stone-700">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="border border-stone-300 bg-white px-3 py-3 text-stone-950 outline-none focus:border-stone-950"
      />
    </label>
  );
}
