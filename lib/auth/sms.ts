/**
 * SMS delivery seam for phone-number OTP codes.
 *
 * better-auth's phoneNumber plugin delivers codes through `sendOtpSms` (wired
 * up in lib/auth/auth.ts), and nothing else in this codebase talks to an SMS
 * gateway — so going live with a real Iranian provider is a one-function
 * change in this file.
 */

/**
 * Env var a real Iranian SMS gateway will read its credential from. It is
 * intentionally unset today: while it is missing, the development mock below
 * is used, and production refuses to run that mock.
 */
const SMS_PROVIDER_API_KEY_ENV = "SMS_PROVIDER_API_KEY";

/** True once a real SMS provider credential is present in the environment. */
export function isRealSmsProviderConfigured(): boolean {
  return Boolean(process.env[SMS_PROVIDER_API_KEY_ENV]?.trim());
}

/**
 * Deliver a phone-number OTP code by SMS.
 *
 * // TODO(sms-provider): THIS IS THE ONLY FUNCTION THAT NEEDS TO CHANGE to go
 * live with a real Iranian SMS gateway (Kavenegar / Melipayamak / SMS.ir / …).
 * Replace the mock branch with an HTTP call to the provider, e.g.:
 *
 *   const res = await fetch(
 *     `https://api.kavenegar.com/v1/${process.env.SMS_PROVIDER_API_KEY}/sms/send.json`,
 *     {
 *       method: "POST",
 *       headers: { "content-type": "application/x-www-form-urlencoded" },
 *       body: new URLSearchParams({
 *         receptor: phoneNumber, // E.164, e.g. 98912xxxxxxx
 *         sender: process.env.SMS_PROVIDER_SENDER ?? "",
 *         message: `کد ورود شما: ${code}`,
 *       }),
 *     },
 *   );
 *   if (!res.ok) throw new Error(`SMS gateway failed: ${res.status}`);
 *
 * Constraints for that swap:
 *   - Keep the signature `(phoneNumber, code) => Promise<void>`, so neither
 *     lib/auth/auth.ts nor the better-auth plugin has to change.
 *   - Decide then whether the number must be normalized to E.164 before the
 *     call (Iranian mobiles: 09xxxxxxxxx → 989xxxxxxxxx); better-auth stores
 *     the number exactly as the user submitted it.
 *   - Do not log the code once a real gateway is in place.
 */
export async function sendOtpSms(
  phoneNumber: string,
  code: string,
): Promise<void> {
  if (isRealSmsProviderConfigured()) {
    // A credential exists but the gateway call is not implemented yet: fail
    // loudly instead of silently falling back to console logging.
    throw new Error(
      `[auth/sms] ${SMS_PROVIDER_API_KEY_ENV} is set but no real SMS provider is implemented yet — finish the TODO(sms-provider) block in lib/auth/sms.ts.`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[auth/sms] Refusing to send OTP codes with the development mock in production. Configure a real SMS provider (see TODO(sms-provider) in lib/auth/sms.ts).",
    );
  }

  // Development mock: print the code to the server console so the whole OTP
  // flow is testable without a gateway or credentials.
  console.log(`[DEV OTP] ${phoneNumber}: ${code}`);
}