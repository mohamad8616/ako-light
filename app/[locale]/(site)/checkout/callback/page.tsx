import PaymentCallbackState from "@/components/checkout/PaymentCallbackState";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { verify } from "@/lib/payments/zarinpal";
import { isLocale } from "@/lib/i18n/routing";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function CheckoutCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string | string[]; Authority?: string | string[]; Status?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const orderId = typeof query.orderId === "string" ? query.orderId : undefined;
  const authority = typeof query.Authority === "string" ? query.Authority : undefined;
  const status = typeof query.Status === "string" ? query.Status : undefined;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment failed</h1>
        <p className="mt-4 text-stone-600">The payment callback did not include an order reference.</p>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      currency: true,
      totalAmount: true,
      zarinpalAuthority: true,
    },
  });

  if (!order || !session || order.userId !== session.user.id) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Unable to verify order</h1>
        <p className="mt-4 text-stone-600">The referenced payment order could not be loaded for this session.</p>
      </main>
    );
  }

  if (status !== "OK" || !authority) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        zarinpalAuthority: authority ?? order.zarinpalAuthority,
        updatedAt: new Date(),
      },
    });

    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment was not completed</h1>
        <p className="mt-4 text-stone-600">The payment gateway returned a failed or cancelled result. You can retry the checkout.</p>
      </main>
    );
  }

  try {
    const result = await verify({
      authority,
      amount: Number(order.totalAmount.toString()),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: result.refId ? "paid" : "failed",
        zarinpalAuthority: authority,
        zarinpalRefId: result.refId ?? null,
        updatedAt: new Date(),
      },
    });

    return (
      <>
        <PaymentCallbackState success={Boolean(result.refId)} />
        <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
          {result.refId ? (
            <>
              <h1 className="text-3xl font-medium">Payment received</h1>
              <p className="mt-4 text-stone-600">
                Your order has been paid successfully.
              </p>
              <div className="mt-6 rounded border border-stone-200 bg-white p-4 text-sm text-stone-700">
                Order ID: <span className="font-mono break-all">{order.id}</span>
                <div className="mt-2">Reference ID: <span className="font-mono break-all">{result.refId}</span></div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-medium">Payment verification failed</h1>
              <p className="mt-4 text-stone-600">The payment was not verified by ZarinPal. Please retry checkout.</p>
            </>
          )}
        </main>
      </>
    );
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        zarinpalAuthority: authority,
        updatedAt: new Date(),
      },
    });

    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment verification failed</h1>
        <p className="mt-4 text-stone-600">
          {error instanceof Error ? error.message : "We could not verify the payment with ZarinPal."}
        </p>
      </main>
    );
  }
}
