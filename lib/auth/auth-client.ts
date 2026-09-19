import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Normalize a base URL env value into something `new URL()` accepts.
 *
 * Vercel-style bare domains (`ako-light.vercel.app`, with no scheme) throw
 * `ERR_INVALID_URL` inside better-auth's client at import time, which fails
 * the production build during page prerendering. Accept the bare form and
 * assume https (production domains are always https on Vercel).
 */
function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * The base URL of the auth server. Comes from NEXT_PUBLIC_APP_URL; in local
 * development we fall back to the Next.js dev server so the client works
 * without extra configuration.
 */
const baseURL =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);

export const authClient = createAuthClient({
  baseURL,
  // phoneNumberClient() surfaces the endpoints of the server-side
  // `phoneNumber` plugin configured in lib/auth/auth.ts.
  plugins: [phoneNumberClient()],
});

export const { signIn, signUp, useSession, phoneNumber } = authClient;

/**
 * Phone-OTP methods exposed for the (not yet built) phone login/register UI:
 *
 *   phoneNumber.sendOtp({ phoneNumber })          → POST /phone-number/send-otp
  *   phoneNumber.verify({ phoneNumber, otp })      → POST /phone-number/verify
  *   phoneNumber.requestPasswordReset({ phoneNumber })
  *   phoneNumber.resetPassword({ phoneNumber, otp, newPassword })
  *   signIn.phoneNumber({ phoneNumber, password }) → POST /sign-in/phone-number
 *
 * In development, `sendOtpSms` (lib/auth/sms.ts) prints the code to the server
 * console as `[DEV OTP] <phoneNumber>: <code>`.
 */
