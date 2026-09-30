/**
 * Order-receipt POLICY and FORMATTING — the pure half of the receipt.
 *
 * Split from lib/notifications/order-receipt.ts so the decisions that matter
 * (which channel, what the message says) are unit-testable without pulling in
 * Prisma, nodemailer or the network. The orchestrator in that file does the
 * IO; this file holds no side effects at all.
 *
 * See the orchestrator's header for the full rationale behind the channel
 * policy. In short:
 *
 *   - `User.phoneNumber` is set (and verified) only for phone-based accounts.
 *   - `Order.phone` is captured at checkout and is ALWAYS present, but is
 *     typed by the customer and unverified.
 *   - `User.email` is ALWAYS present, but phone-based sign-ups get a synthetic
 *     address that cannot receive mail. `emailVerified` is NOT a usable filter
 *     here: email/password sign-ups leave it false because this project does
 *     not require verification, so a real, working address would be discarded.
 *     The synthetic DOMAIN is the reliable discriminator.
 *
 * LOCALE: the order does not store the locale the customer checked out in, so
 * the receipt is written in Persian — the app's canonical locale, and the
 * right default for an SMS landing on an Iranian mobile.
 */
import { formatToman } from "@/lib/i18n/price";

/**
 * Email domain better-auth mints for phone-only accounts.
 *
 * MUST stay in sync with `phoneNumber.signUpOnVerification.getTempEmail` in
 * lib/auth/auth.ts — that function is the only thing that creates these.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "phone.ako-light.local";

/** Which channel a receipt will use, and where it goes. */
export type ReceiptChannel =
  | { kind: "sms"; mobile: string }
  | { kind: "email"; to: string }
  | { kind: "none"; reason: string };

/**
 * True when an address can actually receive mail — i.e. it is present and is
 * not one of the synthetic phone-account addresses.
 */
export function isDeliverableEmail(email: string | null | undefined): boolean {
  const value = email?.trim();
  if (!value) return false;
  return !value.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

/**
 * Chooses the delivery channel for one order.
 *
 * Pure, so the policy is testable without a database. SMS first: the account's
 * verified number outranks the unverified shipping contact, and email is used
 * only when there is no usable phone at all.
 */
export function resolveReceiptChannel({
  accountPhone,
  orderPhone,
  email,
}: {
  /** `User.phoneNumber` — present only for phone-based accounts. */
  accountPhone?: string | null;
  /** `Order.phone` — always present, but unverified. */
  orderPhone?: string | null;
  /** `User.email` — always present, possibly synthetic. */
  email?: string | null;
}): ReceiptChannel {
  const mobile = accountPhone?.trim() || orderPhone?.trim();
  if (mobile) return { kind: "sms", mobile };

  if (isDeliverableEmail(email)) {
    return { kind: "email", to: (email as string).trim() };
  }

  return {
    kind: "none",
    reason: "no usable phone number and no deliverable email address",
  };
}

/** One line of the receipt's item list. */
export type ReceiptItem = {
  /** Localized jsonb name; `fa` preferred, `en` as the fallback. */
  name: unknown;
  quantity: number;
  unitPriceAtPurchase: unknown;
};

/** Reads a `{ en, fa }` jsonb name, tolerating a plain string or junk. */
export function readItemName(name: unknown): string {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const pair = name as { en?: unknown; fa?: unknown };
    const fa = typeof pair.fa === "string" ? pair.fa.trim() : "";
    if (fa) return fa;
    const en = typeof pair.en === "string" ? pair.en.trim() : "";
    if (en) return en;
  }
  return "—";
}

/**
 * The public URL that shows the order.
 *
 * Points at the existing checkout callback, which re-runs ZarinPal
 * verification. That is safe to open repeatedly: ZarinPal answers 101
 * ("already verified") for a settled authority and `isVerificationSuccess`
 * accepts it, so a second visit does not double-charge or fail.
 *
 * The link carries a signed single-order token (`?token=`) so it works when
 * opened from an SMS/email in a different browser or on a different device,
 * where no session is available. The callback page still also accepts a
 * signed-in owner's session, so in-app navigation is unaffected — see
 * lib/orders/access-token.ts for the scope of the token (one order, read-only)
 * and the callback page for the decision order.
 *
 * `token` is an explicit parameter so this stays a pure function: the signing
 * happens on the receipt-sending path (lib/notifications/order-receipt.ts),
 * which owns the clock and the failure handling. Omitting it produces the
 * session-gated URL that was sent before tokens existed.
 */
export function buildOrderUrl({
  orderId,
  authority,
  baseUrl,
  token,
}: {
  orderId: string;
  authority?: string | null;
  baseUrl?: string;
  /** Signed single-order access token; omitted → session-gated link only. */
  token?: string | null;
}): string {
  const root = (
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const url = new URL(`${root}/checkout/callback`);
  url.searchParams.set("orderId", orderId);
  if (authority) url.searchParams.set("Authority", authority);
  url.searchParams.set("Status", "OK");
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

/** Builds the receipt body shared by both channels. */
export function buildOrderReceiptText({
  orderId,
  refId,
  totalToman,
  items,
  url,
}: {
  orderId: string;
  refId?: string | null;
  totalToman: number;
  items: readonly ReceiptItem[];
  url: string;
}): string {
  const lines: string[] = [
    "سفارش شما با موفقیت پرداخت شد.",
    "",
    `شماره سفارش: ${orderId}`,
  ];

  if (refId) lines.push(`کد پیگیری: ${refId}`);

  // Order.totalAmount is stored in Toman, so it is rendered with the same
  // formatter the checkout page and the admin use — never the Rial figure
  // that was sent to ZarinPal.
  lines.push(`مبلغ کل: ${formatToman(totalToman)}`, "", "اقلام:");

  for (const item of items) {
    const unit = Number(String(item.unitPriceAtPurchase));
    lines.push(
      `• ${readItemName(item.name)} × ${item.quantity} — ${formatToman(unit)}`,
    );
  }

  lines.push("", `مشاهده سفارش: ${url}`);

  return lines.join("\n");
}

/** Subject line for the email fallback. */
export function buildOrderReceiptSubject(orderId: string): string {
  return `تأیید سفارش ${orderId}`;
}
