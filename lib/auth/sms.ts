/**
 * SMS delivery seam for phone-number OTP codes — sms.ir Verify integration.
 *
 * better-auth's phoneNumber plugin delivers codes through `sendOtpSms` (wired
 * up in lib/auth/auth.ts), and nothing else in this codebase talks to an SMS
 * gateway — so going live with a real Iranian provider is a one-function
 * change in this file.
 *
 * API: POST https://api.sms.ir/v1/send/verify
 *
 * Mobile number format (confirmed from sms.ir docs / example requests):
 *   - Digits only, no "+" prefix, no leading "0".
 *   - Iranian mobiles arrive as "09xxxxxxxxx" from the user; we strip the
 *     leading "0" so the payload becomes "9xxxxxxxxx" (10 digits).
 *   - No country-code prefix (98) is sent — sms.ir's API expects the national
 *     number without the trunk prefix.
 *
 * Sandbox behaviour:
 *   - The Sandbox API key only supports the fixed Verify template whose ID is
 *     "123456" and whose text is "کد تایید شما: #CODE#".
 *   - Sandbox requests do NOT deliver an actual SMS to a phone.
 *   - While SMSIR_API_KEY is set to a Sandbox key we still console.log the
 *     generated code (clearly labelled `[DEV OTP]`), so the OTP flow is
 *     testable without a real phone. This logging is NOT done when a
 *     production key is detected.
 */

/** Env var sms.ir's API key is read from. */
const SMSIR_API_KEY_ENV = "SMSIR_API_KEY";

/** Env var sms.ir's Verify template ID is read from. */
const SMSIR_VERIFY_TEMPLATE_ID_ENV = "SMSIR_VERIFY_TEMPLATE_ID";

/** Sandbox-only default Verify template ID (fixed by sms.ir). */
const SMSIR_SANDBOX_DEFAULT_TEMPLATE_ID = "123456";

/** True once an sms.ir API key is present in the environment. */
export function isSmsIrConfigured(): boolean {
  return Boolean(process.env[SMSIR_API_KEY_ENV]?.trim());
}

/**
 * Heuristic: decide whether the currently configured SMSIR_API_KEY looks like
 * a Sandbox key or a Production key.
 *
 * sms.ir does not publish a formal prefix/format difference between Sandbox
 * and Production keys in their public docs. The panel labels keys with their
 * type (Sandbox / Production) but the key string itself is opaque. We
 * therefore treat a key as "Sandbox" when SMSIR_VERIFY_TEMPLATE_ID is still
 * the documented Sandbox default ("123456") AND the key is non-empty — the
 * assumption being that anyone who set up a real production template would
 * also have replaced the template ID. This is a best-effort heuristic; it is
 * NOT a cryptographically reliable classification, but it is good enough to
 * drive the dev-console-log gate.
 */
function isSandboxKey(): boolean {
  const key = process.env[SMSIR_API_KEY_ENV]?.trim();
  const templateId = process.env[SMSIR_VERIFY_TEMPLATE_ID_ENV]?.trim();
  if (!key) return false;
  // Still on the Sandbox default template → treat as Sandbox.
  return templateId === SMSIR_SANDBOX_DEFAULT_TEMPLATE_ID;
}

/**
 * Normalize an Iranian mobile number to sms.ir's expected format.
 *
 * Expected output: 10-digit string, digits only, no leading "0", no "+",
 * no country-code prefix. Examples:
 *   "0919xxxx904" → "919xxxx904"
 *   "+98919xxxx904" → "919xxxx904"
 *   "919xxxx904" → "919xxxx904"
 */
function normalizeMobile(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  // Iranian mobiles are 11 digits with a leading 0 (09xxxxxxxxx).
  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1); // drop the leading 0 → 10 digits
  }
  // Already 10 digits, no leading zero → pass through.
  if (digits.length === 10) {
    return digits;
  }
  // Fallback: return whatever digits we have and let sms.ir reject if needed.
  return digits;
}
/**
 * Deliver a phone-number OTP code by SMS via sms.ir's Verify API.
 */
export async function sendOtpSms(
  phoneNumber: string,
  code: string,
): Promise<void> {
  const apiKey = process.env[SMSIR_API_KEY_ENV]?.trim();

  // --- Production safety guards ------------------------------------------
  if (process.env.NODE_ENV === "production") {
    if (!apiKey) {
      throw new Error(
        "[auth/sms] NODE_ENV=production but SMSIR_API_KEY is not set. " +
          "Create a (production) sms.ir API key via the panel " +
          "(برنامه‌نویسان → لیست کلیدهای API → ایجاد کلید جدید, type: Production) " +
          "and set SMSIR_API_KEY in your environment / Vercel.",
      );
    }
    const templateId = process.env[SMSIR_VERIFY_TEMPLATE_ID_ENV]?.trim();
    if (templateId === SMSIR_SANDBOX_DEFAULT_TEMPLATE_ID) {
      // Loud warning: someone deployed without creating a real production
      // template. Throw so better-auth's phoneNumber plugin surfaces a real
      // failure rather than silently sending to the Sandbox template.
      throw new Error(
        "[auth/sms] NODE_ENV=production but SMSIR_VERIFY_TEMPLATE_ID is still " +
          `"${SMSIR_SANDBOX_DEFAULT_TEMPLATE_ID}" (the sms.ir Sandbox default template). ` +
          "This template does not deliver real SMS and is not allowed in production. " +
          "Create a real production Verify template in the sms.ir panel and set " +
          "SMSIR_VERIFY_TEMPLATE_ID to its ID before deploying.",
      );
    }
  }

  // --- Dev-mode fallback when no key is set ------------------------------
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // Already thrown above, but keep the guard symmetrical.
      throw new Error(
        "[auth/sms] Refusing to send OTP codes without SMSIR_API_KEY in production. " +
          "Configure a real sms.ir API key (see setup instructions in .env.example).",
      );
    }
    // Development mock: print the code to the server console so the whole OTP
    // flow is testable without a gateway or credentials.
    console.log(`[DEV OTP] ${phoneNumber}: ${code}`);
    return;
  }

  // --- Real sms.ir Verify API call ----------------------------------------
  const mobile = normalizeMobile(phoneNumber);
  const templateId = Number(
    process.env[SMSIR_VERIFY_TEMPLATE_ID_ENV]?.trim() ??
      SMSIR_SANDBOX_DEFAULT_TEMPLATE_ID,
  );

  const body = JSON.stringify({
    mobile,
    templateId,
    parameters: [{ name: "Code", value: code }],
  });

  // Sandbox convenience: log the generated code to the server console so the
  // OTP flow is still observable without a real phone. The Sandbox does NOT
  // deliver an actual SMS (confirmed from sms.ir docs), so this is a dev
  // convenience, NOT something that should ever run against a production key.
  if (isSandboxKey()) {
    console.log(
      `[DEV OTP] ${phoneNumber} (sent as ${mobile}): ${code}  [sms.ir Sandbox — no actual SMS delivered]`,
    );
  }

  const res = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
      "x-api-key": apiKey,
    },
    body,
  });

  if (!res.ok) {
    let errorMessage = `[auth/sms] sms.ir returned HTTP ${res.status}`;
    try {
      const text = await res.text();
      errorMessage += `: ${text}`;
    } catch {
      // response body not readable — keep the status-only message.
    }
    throw new Error(errorMessage);
  }

  let payload: { status?: number | string; message?: string };
  try {
    payload = (await res.json()) as {
      status?: number | string;
      message?: string;
    };
  } catch {
    // sms.ir sometimes returns text/plain; if JSON parsing fails we treat a
    // 2xx as success and surface the raw body only on failure.
    if (res.status >= 400) {
      const text = await res.text();
      throw new Error(`[auth/sms] sms.ir: ${text}`);
    }
    return;
  }

  // sms.ir's Verify API returns { status: 1, message: "موفق", ... } on success.
  if (payload.status !== 1) {
    throw new Error(
      `[auth/sms] sms.ir Verify API declined the request ` +
        `(status: ${payload.status ?? "undefined"}` +
        (payload.message ? `, message: ${payload.message}` : "") +
        ").",
    );
  }
}


