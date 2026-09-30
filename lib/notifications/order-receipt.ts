/**
 * Order receipt — the post-payment notification (IO orchestrator).
 *
 * Fired once, from the ZarinPal verification success path (the checkout
 * callback route). Everything here is best-effort by design: the customer has
 * already been charged and is looking at the confirmation page, so a gateway
 * outage or a bad SMTP credential must never turn a successful payment into an
 * error screen. {@link sendOrderReceipt} therefore never throws — it logs and
 * returns.
 *
 * The channel policy and the message formatting live in
 * lib/notifications/order-receipt-text.ts, which is pure and unit-tested. This
 * file only does IO: load the order, pick the channel, hand the text to the
 * SMS or email transport.
 */
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import {
  buildOrderReceiptSubject,
  buildOrderReceiptText,
  buildOrderUrl,
  resolveReceiptChannel,
} from "@/lib/notifications/order-receipt-text";
import { sendPlainSms } from "@/lib/notifications/sms";
import { signOrderAccessToken } from "@/lib/orders/access-token";

export {
  buildOrderReceiptSubject,
  buildOrderReceiptText,
  buildOrderUrl,
  isDeliverableEmail,
  resolveReceiptChannel,
  SYNTHETIC_EMAIL_DOMAIN,
  type ReceiptChannel,
  type ReceiptItem,
} from "@/lib/notifications/order-receipt-text";

/**
 * Sends the receipt for one order.
 *
 * NEVER THROWS. Call it from the payment success path and ignore the result;
 * failures are logged with enough context to be actionable (which order, which
 * channel, why) without leaking the customer's contact details into the log.
 */
export async function sendOrderReceipt(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        phone: true,
        zarinpalAuthority: true,
        zarinpalRefId: true,
        user: { select: { email: true, phoneNumber: true } },
        items: {
          select: { name: true, quantity: true, unitPriceAtPurchase: true },
        },
      },
    });

    if (!order) {
      console.error(
        `[notifications/receipt] order ${orderId} not found — nothing sent.`,
      );
      return;
    }

    const channel = resolveReceiptChannel({
      accountPhone: order.user?.phoneNumber,
      orderPhone: order.phone,
      email: order.user?.email,
    });

    if (channel.kind === "none") {
      console.error(
        `[notifications/receipt] order ${orderId} has no delivery channel: ${channel.reason}.`,
      );
      return;
    }

    // Mint the signed single-order link token here, at the moment the receipt
    // is sent, so its 30-day lifetime starts when the customer receives it.
    //
    // Signing is inside the same try/catch as the send: this file is
    // best-effort by contract, and a missing signing key must not fail the
    // customer's confirmation page. On failure the link falls back to the
    // session-gated form — degraded for a logged-out recipient, but never
    // broken and never a thrown error out of `sendOrderReceipt`.
    let token: string | null = null;
    try {
      token = signOrderAccessToken(order.id);
    } catch (error) {
      console.error(
        `[notifications/receipt] order ${orderId} could not be signed for a tokenised link:`,
        error instanceof Error ? error.message : error,
      );
    }

    const text = buildOrderReceiptText({
      orderId: order.id,
      refId: order.zarinpalRefId,
      // Order.totalAmount is stored in Toman; the formatter never converts.
      totalToman: Number(String(order.totalAmount)),
      items: order.items,
      url: buildOrderUrl({
        orderId: order.id,
        authority: order.zarinpalAuthority,
        token,
      }),
    });

    if (channel.kind === "sms") {
      await sendPlainSms({ mobile: channel.mobile, text });
      console.log(`[notifications/receipt] order ${orderId} sent by SMS.`);
      return;
    }

    await sendEmail({
      to: channel.to,
      subject: buildOrderReceiptSubject(order.id),
      text,
    });
    console.log(`[notifications/receipt] order ${orderId} sent by email.`);
  } catch (error) {
    // Deliberately swallowed: the payment already succeeded and the customer
    // is on the confirmation page. Losing a receipt is bad; failing the
    // confirmation page for it is worse.
    console.error(
      `[notifications/receipt] order ${orderId} failed to send:`,
      error instanceof Error ? error.message : error,
    );
  }
}
