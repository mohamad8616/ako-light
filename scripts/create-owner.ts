/**
 * Create (or promote) the owner account.
 *
 * Creates `owner@gmail.com` with the given password and `User.role = "owner"`.
 *
 * WHY THIS GOES THROUGH BETTER AUTH RATHER THAN A RAW INSERT
 *
 * Better Auth does not store a plaintext password on `User`. It writes a
 * `bcrypt`-style hash into the `Account` row for the `credential` provider
 * (providerId "credential"), and it owns the hashing parameters. A hand-written
 * INSERT would produce a row that LOOKS right and can never sign in, because
 * the hash would not match what `signInEmail` recomputes. `auth.api.signUpEmail`
 * is the only path that creates a usable credential, so it is the path used
 * here — the role is then set on the row it produced.
 *
 * Idempotent: re-running promotes/resets the existing account instead of
 * failing on the unique email.
 *
 *   node_modules/.bin/tsx scripts/create-owner.ts
 */
import "dotenv/config";
import { auth } from "@/lib/auth/auth";
import { ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

const EMAIL = "owner@gmail.com";
const PASSWORD = "owner123";
const NAME = "Owner";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, role: true },
  });

  if (existing) {
    // Already present: make sure the role is right. The password cannot be
    // "reset" here without better-auth's own credential flow, so an existing
    // account keeps whatever password it has — reported below.
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: ROLES.owner },
      select: { id: true, email: true, role: true },
    });
    console.log("existing account found — role ensured:", updated);
    console.log(
      "NOTE: its password was NOT changed. Delete the row first if you need to reset it.",
    );
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
    console.log("created owner account:", updated);
  }

  // Prove the credential actually works — a row that exists but cannot sign in
  // is exactly the failure mode this script exists to avoid.
  const signIn = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    asResponse: true,
  });
  console.log(
    "sign-in check:",
    signIn.status === 200 ? "OK" : `FAILED (${signIn.status})`,
  );

  await prisma.$disconnect();
}

void main();
