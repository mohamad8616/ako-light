import { Prisma } from "@/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(Prisma, {
    provider: "postgresql", // or "mysql", "sqlite", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()], // make sure this is the last plugin in the array
});
