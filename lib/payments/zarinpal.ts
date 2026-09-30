export type ZarinPalMode = "sandbox" | "production";

export type ZarinPalRequestResult = {
  code: number;
  message: string;
  authority: string;
  redirectUrl: string;
};

export type ZarinPalVerificationResult = {
  code: number;
  message: string;
  refId?: string;
};

/**
 * Why a ZarinPal call failed — the distinction the checkout callback depends on.
 *
 * It matters because the two kinds of failure call for OPPOSITE responses from
 * the order state machine:
 *
 *   - `"rejected"` — ZarinPal answered, and the answer was about THIS payment:
 *     a failed/cancelled transaction, or a business code such as 101-already-
 *     verified. The payment definitively did not succeed, so the caller is
 *     entitled to write `Order.status = "failed"`.
 *
 *   - `"gateway"` — we never got a verdict on this payment: the merchant id is
 *     missing/malformed, the HTTP call failed, the response was unparseable, a
 *     non-2xx status came back, or the network was down. The customer may have
 *     paid and we simply cannot tell. Writing `"failed"` here is a DATA-
 *     CORRUPTION bug: it discards a real payment, tells the customer to retry
 *     (so they can pay twice), and hides an infrastructure outage behind an
 *     ordinary-looking failed order. The caller must therefore leave the order
 *     in a recoverable state and surface that it could not confirm.
 *
 * The cost of getting this wrong is asymmetric: a `"gateway"` failure that is
 * misreported as `"rejected"` loses money and is invisible; the reverse only
 * leaves a paid order unreconciled, which is recoverable by re-verifying.
 */
export type ZarinPalFailureKind = "rejected" | "gateway";

/**
 * Error thrown for every ZarinPal failure, tagged with the kind above so the
 * caller never has to pattern-match on a message string.
 */
export class ZarinPalError extends Error {
  readonly kind: ZarinPalFailureKind;
  /** ZarinPal's business code when there was one; `null` for transport faults. */
  readonly code: number | null;

  constructor(
    kind: ZarinPalFailureKind,
    message: string,
    code: number | null = null,
  ) {
    super(message);
    this.name = "ZarinPalError";
    this.kind = kind;
    this.code = code;
  }

  /**
   * True when we have no verdict on the payment, so the caller must NOT record
   * a terminal `"failed"` status. Reads better at the call site than
   * `error.kind === "gateway"`.
   */
  get isGatewayFault(): boolean {
    return this.kind === "gateway";
  }
}

/**
 * Sentinel business codes for the `"gateway"` class.
 *
 * ZarinPal returns `code: 0` (and a `message`) when it rejects the CALL rather
 * than the payment — an unrecognised/misconfigured merchant id is the common
 * cause, and their message does not always name it. Treating every `code: 0`
 * as a failed payment is precisely the bug: the merchant id is wrong, so no
 * customer can ever pay, and every attempt is silently recorded as a failed
 * order. A caller that has genuinely no verdict must not be indistinguishable
 * from one that was told "no".
 */
const NO_VERDICT_CODE = 0;

// ZarinPal's official payment API documentation states the payment amount is
// expressed in Iranian Rial (IRR), with a default currency of IRR and a minimum
// amount of 10,000 IRR.
//
// This project stores and charges every amount in Toman (Product.priceToman,
// Order.totalAmount, OrderItem.unitPriceAtPurchase). EUR is a display-only price
// for en-locale visitors and is NEVER charged, so there is no EUR conversion —
// and no exchange rate — anywhere in this module. The only conversion here is
// the fixed Toman-to-Rial unit fact, applied at the gateway boundary so the
// stored order model stays in Toman.
export const toRial = (toman: number) => toman * 10;

export function buildZarinPalBaseUrl(
  mode: string = process.env.ZARINPAL_MODE ?? "sandbox",
) {
  return mode === "production"
    ? "https://payment.zarinpal.com"
    : "https://sandbox.zarinpal.com";
}

export function isPaymentRequestSuccess(code: number) {
  return code === 100;
}

export function isVerificationSuccess(code: number) {
  return code === 100 || code === 101;
}

/**
 * Whether a merchant id is structurally usable.
 *
 * ZarinPal issues merchant ids as UUIDs. A value that is present but malformed
 * (a truncated paste, the merchant *name*, a placeholder like `CHANGEME`) is
 * the most dangerous misconfiguration there is: it is non-empty, so a mere
 * presence check passes, and ZarinPal then rejects every call with `code: 0` —
 * which used to be recorded as a failed payment for every customer.
 *
 * Exported so the startup env validation (lib/env.ts) can reject it at boot,
 * where it is a one-line fix, rather than at the callback, where it silently
 * destroys paid orders. The UUID shape is deliberately the only structural
 * check: anything stricter would break if ZarinPal ever widens the format.
 */
export function isMerchantIdShaped(merchantId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    merchantId.trim(),
  );
}

/**
 * Reads and validates the merchant id.
 *
 * Throws a `"gateway"`-kind `ZarinPalError` — never a plain `Error` — so the
 * misconfiguration propagates as "we could not reach a verdict", not as "the
 * payment failed". The message names the variable so the operator can act on
 * it; it deliberately does NOT echo the value, so a real merchant id cannot
 * leak into logs or an error page.
 */
function getMerchantId() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;

  if (!merchantId || merchantId.trim().length === 0) {
    throw new ZarinPalError(
      "gateway",
      "ZARINPAL_MERCHANT_ID is not set. ZarinPal cannot be reached, so payment could not be verified.",
    );
  }

  if (!isMerchantIdShaped(merchantId)) {
    throw new ZarinPalError(
      "gateway",
      "ZARINPAL_MERCHANT_ID is malformed (expected a ZarinPal UUID). ZarinPal could not be reached, so payment could not be verified.",
    );
  }

  return merchantId.trim();
}

async function postJson<T>(url: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // DNS failure, connection refused, TLS error, timeout, abort — no verdict.
    // This is the case a flaky network can produce for an order the customer
    // already paid, so it must be classified as a gateway fault.
    throw new ZarinPalError(
      "gateway",
      `Could not reach ZarinPal: ${error instanceof Error ? error.message : "network error"}.`,
    );
  }

  // A non-JSON body (an HTML error page from a proxy, a truncated response)
  // must not crash the parse path — it is still "no verdict", not "declined".
  let payload: T;
  try {
    payload = (await response.json()) as T;
  } catch {
    throw new ZarinPalError(
      "gateway",
      `ZarinPal returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    // A non-2xx status is always a gateway fault, never a declined payment:
    //   5xx — the gateway is broken;
    //   4xx — the CALL was malformed (bad merchant id, bad amount), which is a
    //         misconfiguration. Either way we have no verdict on this payment.
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: string }).message ?? "")
        : "";
    throw new ZarinPalError(
      "gateway",
      message || `ZarinPal request failed with HTTP ${response.status}.`,
    );
  }

  return payload;
}

/**
 * Creates a ZarinPal payment request.
 *
 * `amountToman` is the order total in Toman — always derived from
 * Product.priceToman (never priceEur), whichever locale started the checkout.
 * It is converted x10 to Rial here, at the API call boundary.
 */
export async function request({
  amountToman,
  description,
  callbackUrl,
  currency = "IRR",
}: {
  /** Order total in Toman. The only unit ever charged. */
  amountToman: number;
  description: string;
  callbackUrl: string;
  /** Defaults to IRR. The stored amount is Toman, so `toRial` is always
   * applied — do not pass "IRT", which would double-convert. */
  currency?: "IRR" | "IRT";
}): Promise<ZarinPalRequestResult> {
  const merchantId = getMerchantId();
  const mode = (process.env.ZARINPAL_MODE ?? "sandbox") as ZarinPalMode;
  const baseUrl = buildZarinPalBaseUrl(mode);
  const payload = await postJson<{
    data?: { code?: number; message?: string; authority?: string };
  }>(`${baseUrl}/pg/v4/payment/request.json`, {
    merchant_id: merchantId,
    amount: toRial(amountToman),
    callback_url: callbackUrl,
    description,
    currency,
  });

  const code = payload.data?.code ?? 0;
  const authority = payload.data?.authority ?? "";
  const message = payload.data?.message ?? "ZarinPal payment request failed.";

  if (!isPaymentRequestSuccess(code) || !authority) {
    // `code: 0` means ZarinPal rejected the CALL, not the payment — an
    // unrecognised merchant id being the usual cause. Every customer would hit
    // this, so it must be loud rather than reported as a failed payment.
    throw new ZarinPalError(
      code === NO_VERDICT_CODE || !authority ? "gateway" : "rejected",
      message || "ZarinPal payment request failed.",
      code,
    );
  }

  return {
    code,
    message,
    authority,
    redirectUrl: `${baseUrl}/pg/StartPay/${authority}`,
  };
}

/**
 * Verifies a ZarinPal payment against the order's stored total.
 *
 * `amountToman` is the order total in Toman (Order.totalAmount); it is
 * converted x10 to Rial here, matching the amount sent in `request`.
 */
export async function verify({
  authority,
  amountToman,
  currency = "IRR",
}: {
  authority: string;
  /** Order total in Toman. The only unit ever charged. */
  amountToman: number;
  /** Defaults to IRR — always Rial, per `toRial`. See `request`. */
  currency?: "IRR" | "IRT";
}): Promise<ZarinPalVerificationResult> {
  const merchantId = getMerchantId();
  const mode = (process.env.ZARINPAL_MODE ?? "sandbox") as ZarinPalMode;
  const baseUrl = buildZarinPalBaseUrl(mode);
  const payload = await postJson<{
    data?: { code?: number; message?: string; ref_id?: string };
  }>(`${baseUrl}/pg/v4/payment/verify.json`, {
    merchant_id: merchantId,
    amount: toRial(amountToman),
    authority,
    currency,
  });

  const code = payload.data?.code ?? 0;
  const message = payload.data?.message ?? "ZarinPal verification failed.";
  const refId = payload.data?.ref_id;

  if (!isVerificationSuccess(code)) {
    // THIS is the distinction the whole module exists to make. ZarinPal reports
    // both "the customer never paid" and "your merchant id is wrong" through
    // this one branch, and conflating them is the data-corruption bug: a
    // misconfigured merchant id would mark every genuinely paid order `failed`.
    //
    //   - code 0 / absent → ZarinPal rejected the call itself: no verdict on
    //     the payment → gateway fault → the caller must NOT write "failed".
    //   - any other non-success code (101-already-verified, -51, …) → ZarinPal
    //     answered about THIS payment → a real rejection.
    throw new ZarinPalError(
      code === NO_VERDICT_CODE ? "gateway" : "rejected",
      message || "ZarinPal verification failed.",
      code,
    );
  }

  return {
    code,
    message,
    refId,
  };
}
