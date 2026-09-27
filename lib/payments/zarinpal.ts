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

function getMerchantId() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchantId || merchantId.trim().length === 0) {
    throw new Error("Missing ZARINPAL_MERCHANT_ID environment variable.");
  }
  return merchantId;
}

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: string }).message ?? "")
        : "";
    throw new Error(
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
    throw new Error(message || "ZarinPal payment request failed.");
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
    throw new Error(message || "ZarinPal verification failed.");
  }

  return {
    code,
    message,
    refId,
  };
}
