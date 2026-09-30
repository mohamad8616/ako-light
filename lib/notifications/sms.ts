/**
 * Plain-message SMS delivery — sms.ir's BULK endpoint.
 *
 * This is deliberately NOT lib/auth/sms.ts. That module is the OTP seam and
 * calls `POST /v1/send/verify`, which sends a *template* message: sms.ir
 * substitutes placeholders into a template registered in their panel, and the
 * text is fixed there. An order receipt is free-form, so it needs the other
 * endpoint:
 *
 *   POST https://api.sms.ir/v1/send/bulk
 *   { lineNumber: <long>, messageText: <string>, mobiles: [<10-digit>, ...] }
 *
 * Two consequences worth knowing before touching this file:
 *
 *  1. **`lineNumber` is mandatory** and is a dedicated sending line the account
 *     must own (panel → lines). The Verify endpoint needs no such thing, which
 *     is why `SMSIR_LINE_NUMBER` is a new, separate setting.
 *
 *  2. **Sandbox for the bulk endpoint is NOT documented by sms.ir.** Their
 *     sandbox docs publish a concrete example only for `/send/verify` (fixed
 *     template "123456"). They state generically that the sandbox mirrors the
 *     production URL/input/output shape, but there is no published bulk
 *     example and no documented bulk sandbox template. So a sandbox key may or
 *     may not be accepted here — this module therefore never assumes sandbox
 *     delivery, and falls back to a console log when it is not configured.
 *
 * Response envelope: `{ status: 1, message: "موفق", data: { packId,
 * messageIds, cost } }` on success. Only `status` is treated as the verdict —
 * `data` is not required, which also keeps this compatible with the test-tier
 * fetch guard that answers with `data: null`.
 */
import { normalizeIranianMobile } from "@/lib/sms/normalize-mobile";

/** Env var sms.ir's API key is read from (same key as the Verify endpoint). */
const SMSIR_API_KEY_ENV = "SMSIR_API_KEY";

/** Env var holding the dedicated sending line number the bulk endpoint needs. */
const SMSIR_LINE_NUMBER_ENV = "SMSIR_LINE_NUMBER";

const BULK_ENDPOINT = "https://api.sms.ir/v1/send/bulk";

/** True when both the API key and a sending line are present. */
export function isBulkSmsConfigured(): boolean {
  return Boolean(
    process.env[SMSIR_API_KEY_ENV]?.trim() &&
      process.env[SMSIR_LINE_NUMBER_ENV]?.trim(),
  );
}

/**
 * Delivers one plain-text SMS.
 *
 * Throws on a real gateway failure so the caller can log it; the order-receipt
 * orchestrator deliberately swallows that (a receipt must never break the
 * payment confirmation page).
 */
export async function sendPlainSms({
  mobile,
  text,
}: {
  /** Recipient in any Iranian format; normalised before sending. */
  mobile: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env[SMSIR_API_KEY_ENV]?.trim();
  const lineNumber = process.env[SMSIR_LINE_NUMBER_ENV]?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  // --- Production safety guards ------------------------------------------
  // Mirrors lib/auth/sms.ts: production must never silently no-op a message
  // the customer is expecting.
  if (isProduction) {
    if (!apiKey) {
      throw new Error(
        "[notifications/sms] NODE_ENV=production but SMSIR_API_KEY is not set. " +
          "Create a Production API key in the sms.ir panel and set it in your environment.",
      );
    }
    if (!lineNumber) {
      throw new Error(
        "[notifications/sms] NODE_ENV=production but SMSIR_LINE_NUMBER is not set. " +
          "The bulk (plain message) endpoint requires a dedicated sending line — " +
          "read it from the sms.ir panel and set SMSIR_LINE_NUMBER.",
      );
    }
  }

  // --- Dev-mode fallback when the gateway is not configured ---------------
  // Not configured is normal in development and in CI, so log the message the
  // customer would have received rather than throwing.
  if (!apiKey || !lineNumber) {
    const missing = !apiKey
      ? SMSIR_API_KEY_ENV
      : `${SMSIR_LINE_NUMBER_ENV} (required by the bulk endpoint)`;
    console.log(
      `[DEV SMS] ${mobile} — not sent, ${missing} is unset.\n${text}`,
    );
    return;
  }

  const body = JSON.stringify({
    lineNumber: Number(lineNumber),
    messageText: text,
    mobiles: [normalizeIranianMobile(mobile)],
  });

  const res = await fetch(BULK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    body,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // body not readable — keep the status-only message.
    }
    throw new Error(
      `[notifications/sms] sms.ir bulk returned HTTP ${res.status}` +
        (detail ? `: ${detail}` : ""),
    );
  }

  let payload: { status?: number | string; message?: string };
  try {
    payload = (await res.json()) as { status?: number | string; message?: string };
  } catch {
    // sms.ir can answer with text/plain; a 2xx with an unreadable body is
    // treated as delivered rather than a failure.
    return;
  }

  // sms.ir returns { status: 1, message: "موفق" } on success.
  if (payload.status !== 1) {
    throw new Error(
      `[notifications/sms] sms.ir bulk declined the request ` +
        `(status: ${payload.status ?? "undefined"}` +
        (payload.message ? `, message: ${payload.message}` : "") +
        ").",
    );
  }
}
