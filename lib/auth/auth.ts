import {
  ADMIN_ROLES,
  ROLES,
  accessControl,
  rolePermissions,
} from "@/lib/auth/permissions";
import { sendOtpSms } from "@/lib/auth/sms";
import { prisma } from "@/lib/db/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, phoneNumber } from "better-auth/plugins";

/**
 * Normalize a base URL env value into something `new URL()` accepts.
 *
 * A bare domain (`ako-light.vercel.app`, with no scheme) throws
 * `ERR_INVALID_URL` at import time and fails the production build during
 * page prerendering. Accept the bare form and assume https (production
 * domains are always https on Vercel).
 */
function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export const auth = betterAuth({
  // Prefer the server-side BETTER_AUTH_URL; fall back to the public app URL
  // so a missing BETTER_AUTH_URL alone can never crash with Invalid URL.
  baseURL: normalizeBaseUrl(
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  ),
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "sqlite", ...etc
  }),
  user: {
    // Lets phoneNumber.verify() forward `referredByCode` (and any future
    // extra body field) into createUser on the sign-up path — the verify
    // endpoint runs parseUserInput(rest, "create"), which only keeps fields
    // declared here. Must have a matching column (see User.referredByCode
    // in prisma/schema.prisma).
    additionalFields: {
      referredByCode: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      // Defaults pinned explicitly so the OTP contract is visible to the
      // login UI step: 6 digits, 5 minutes, 3 verification attempts.
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      // Unified sign-in/sign-up: a single phoneNumber.verify() call creates
      // a new account for an unrecognized number or logs in an existing one.
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@phone.ako-light.local`,
        getTempName: (phoneNumber) => phoneNumber,
      },
      // Every OTP delivery goes through the mock sender in lib/auth/sms.ts —
      // a real SMS provider is swapped in there, not here.
      sendOTP: async ({ phoneNumber: to, code }) => {
        await sendOtpSms(to, code);
      },
    }),
    admin({
      defaultRole: ROLES.user,
      // Both roles are admin-level actors, but their permissions differ (see
      // lib/auth/permissions.ts): only `owner` may impersonate other admins.
      adminRoles: [...ADMIN_ROLES],
      ac: accessControl,
      roles: rolePermissions,
    }),
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
