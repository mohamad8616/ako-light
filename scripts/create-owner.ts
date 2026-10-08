/**
 * Create (or promote) an owner account.
 *
 * Creates the account with the given password and `User.role = "owner"`.
 *
 *   node_modules/.bin/tsx scripts/create-owner.ts <email> <password> [name]
 *   node_modules/.bin/tsx scripts/create-owner.ts            # uses the defaults below
 *
 * With no arguments the defaults are `owner@gmail.com` / `Owner123` / `Owner`.
 * Values may also come from the environment (`OWNER_EMAIL`, `OWNER_PASSWORD`,
 * `OWNER_NAME`); explicit CLI arguments win over the environment, which wins
 * over the defaults.
 *
 * WHY THIS GOES THROUGH BETTER AUTH RATHER THAN A RAW INSERT
 *
 * Better Auth does not store a plaintext password on `User`. It writes a hash
 * into the `Account` row for the `credential` provider (providerId
 * "credential"), and it owns the hashing parameters. A hand-written INSERT
 * would produce a row that LOOKS right and can never sign in, because the hash
 * would not match what `signInEmail` recomputes. `auth.api.signUpEmail` is the
 * only path that creates a usable credential, so it is the path used here —
 * the role is then set on the row it produced.
 *
 * The one place this script hashes on its own is resetting the password of an
 * account that ALREADY exists (sign-up would fail on the unique email). It uses
 * better-auth's own `hashPassword` from `better-auth/crypto`, so the value it
 * writes is byte-for-byte the format `signInEmail` expects.
 *
 * Idempotent: re-running ensures the role AND the password, instead of failing
 * on the unique email.
 *
 * NOTE: passwords typed on a shell command line end up in the shell history.
 * Prefer the environment for anything real:
 *   OWNER_PASSWORD=... node_modules/.bin/tsx scripts/create-owner.ts someone@example.com
 */
// MUST be the FIRST import. ESM evaluates imports in declaration order, and
// `@/lib/db/prisma` reads `process.env.DATABASE_URL` at MODULE LOAD time to
// build its pg adapter. If dotenv has not run yet, that read yields undefined,
// pg silently falls back to localhost:5432, and the script dies with a
// confusing `ECONNREFUSED` on its first query instead of a missing-variable
// error. (prisma/seed.ts has the same ordering for the same reason.)
import "dotenv/config";

import { auth } from "@/lib/auth/auth";
import { ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "better-auth/crypto";

const DEFAULT_EMAIL = "owner@gmail.com";
const DEFAULT_PASSWORD = "Owner123";

/** First CLI argument that is present and non-empty, else the fallback. */
function arg(index: number, fallback: string): string {
  return process.argv[index]?.trim() || fallback;
}

const EMAIL = arg(2, process.env.OWNER_EMAIL?.trim() || DEFAULT_EMAIL);
const PASSWORD = arg(3, process.env.OWNER_PASSWORD || DEFAULT_PASSWORD);
// Default the display name to the local part of the address ("malek@gmail.com"
// -> "Malek") rather than to a generic "Owner".
const NAME = arg(
  4,
  process.env.OWNER_NAME?.trim() ||
    EMAIL.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
);

/**
 * Writes the credential hash for an existing user.
 *
 * `providerId: "credential"` + `accountId: userId` is the shape better-auth
 * looks up on sign-in. This schema has no unique index covering those two
 * columns, so the row is found first and then updated or created.
 */
async function setCredentialPassword(userId: string, password: string) {
  const hash = await hashPassword(password);
  const existing = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hash },
    });
    return "updated";
  }

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
    },
  });
  return "created";
}

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, role: true },
  });

  if (existing) {
    // Already present: sign-up would fail on the unique email, so ensure the
    // role and then write the credential directly.
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: ROLES.owner, name: NAME },
      select: { id: true, email: true, role: true },
    });
    const credential = await setCredentialPassword(existing.id, PASSWORD);
    console.log(`existing account found — role ensured: ${JSON.stringify(updated)}`);
    console.log(`credential password ${credential}.`);
  } else {
    const response = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: NAME },
      asResponse: true,
    });

    if (response.status !== 200) {
      const body = await response.text();
      throw new Error(`sign-up failed (${response.status}): ${body}`);
    }

    const updated = await prisma.user.update({
      where: { email: EMAIL },
      data: { role: ROLES.owner },
      select: { id: true, email: true, role: true },
    });
    console.log(`created owner account: ${JSON.stringify(updated)}`);
  }

  // Prove the credential actually works — a row that exists but cannot sign in
  // is exactly the failure mode this script exists to avoid.
  const signIn = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    asResponse: true,
  });
  console.log(
    `sign-in check for ${EMAIL}:`,
    signIn.status === 200 ? "OK" : `FAILED (${signIn.status})`,
  );

  await prisma.$disconnect();
}

void main();
