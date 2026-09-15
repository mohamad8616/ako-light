import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * The base URL of the auth server. Comes from NEXT_PUBLIC_APP_URL; in local
 * development we fall back to the Next.js dev server so the client works
 * without extra configuration.
 */
const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ??
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
