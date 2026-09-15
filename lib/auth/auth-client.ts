import { createAuthClient } from "better-auth/react";

/**
 * The base URL of the auth server. Comes from NEXT_PUBLIC_APP_URL; in local
 * development we fall back to the Next.js dev server so the client works
 * without extra configuration.
 */
const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);

export const authClient = createAuthClient({ baseURL });

export const { signIn, signUp, useSession } = authClient;
