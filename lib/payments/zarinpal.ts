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
// amount of 10,000 IRR. This project currently stores cart totals in EUR, so we
// convert the amount at the gateway boundary rather than mutating the stored
// order currency model.
export const ZARINPAL_DEFAULT_RIAL_RATE = 1_050_000;

export function buildZarinPalBaseUrl(
  mode: string = process.env.ZARINPAL_MODE ?? "sandbox",
) {
  return mode === "production"
    ? "https://payment.zarinpal.com"
    : "https://sandbox.zarinpal.com";
}

export function toZarinPalAmount(
  amount: number,
  rate: number = ZARINPAL_DEFAULT_RIAL_RATE,
) {
  return Math.round(Number(amount) * rate);
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

export async function request({
  amount,
  description,
  callbackUrl,
  currency = "IRR",
}: {
  amount: number;
  description: string;
  callbackUrl: string;
  currency?: "IRR" | "IRT";
}): Promise<ZarinPalRequestResult> {
  const merchantId = getMerchantId();
  const mode = (process.env.ZARINPAL_MODE ?? "sandbox") as ZarinPalMode;
  const baseUrl = buildZarinPalBaseUrl(mode);
  const payload = await postJson<{
    data?: { code?: number; message?: string; authority?: string };
  }>(`${baseUrl}/pg/v4/payment/request.json`, {
    merchant_id: merchantId,
    amount: toZarinPalAmount(amount),
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

export async function verify({
  authority,
  amount,
  currency = "IRR",
}: {
  authority: string;
  amount: number;
  currency?: "IRR" | "IRT";
}): Promise<ZarinPalVerificationResult> {
  const merchantId = getMerchantId();
  const mode = (process.env.ZARINPAL_MODE ?? "sandbox") as ZarinPalMode;
  const baseUrl = buildZarinPalBaseUrl(mode);
  const payload = await postJson<{
    data?: { code?: number; message?: string; ref_id?: string };
  }>(`${baseUrl}/pg/v4/payment/verify.json`, {
    merchant_id: merchantId,
    amount: toZarinPalAmount(amount),
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
