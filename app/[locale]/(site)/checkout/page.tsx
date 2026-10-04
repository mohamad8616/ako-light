import CheckoutForm from "@/components/checkout/CheckoutForm";
import { auth } from "@/lib/auth/auth";
import { getLocalizedPath, isLocale } from "@/lib/i18n/routing";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    // Both the callback target and the sign-in URL keep the visitor's
    // language tree, so a Persian checkout returns to /fa/... after sign-in
    // rather than dropping them into the English default.
    const callback = getLocalizedPath("/checkout", locale);
    redirect(
      `${getLocalizedPath("/sign-in", locale)}?redirectTo=${encodeURIComponent(callback)}`,
    );
  }

  const orderId = typeof query.orderId === "string" ? query.orderId : undefined;

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-32 text-stone-950 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
          Checkout
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight md:text-6xl">
          {orderId ? "Order created" : "Shipping details"}
        </h1>
        {orderId ? (
          <div className="mt-10 max-w-xl border-stone-200 bg-white p-6 text-sm text-stone-700">
            Your order has been created and is pending payment. Order ID:
            <span className="mt-2 block font-mono text-xs break-all text-stone-950">
              {orderId}
            </span>
            <p className="mt-4 text-stone-500">
              Payment integration will be connected in Part C.
            </p>
          </div>
        ) : (
          <div className="mt-12">
            <CheckoutForm />
          </div>
        )}
      </div>
    </main>
  );
}
