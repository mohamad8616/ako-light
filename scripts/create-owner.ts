/**
 * Bootstrap the FIRST owner account (Pass B).
 *
 *   OWNER_EMAIL=you@example.com OWNER_PASSWORD='<strong passphrase>' \
 *     pnpm create:owner
 *
 *   pnpm create:owner you@example.com '<strong passphrase>' "Display Name"
 *
 * ── WHAT CHANGED, AND WHY ───────────────────────────────────────────────────
 *
 * This script used to default to a fixed email and password committed to this
 * repository, so running it with no arguments minted a full-privilege account
 * whose password anyone with repository access already knew. It also PROMOTED
 * any existing account with the given email and OVERWROTE that account's
 * password — one mistyped address was an account takeover. Both are gone:
 *
 *   - the email and password must be supplied explicitly; there is no fallback;
 *   - an email that already belongs to ANY account is a hard stop, in every
 *     role, and nothing is promoted or reset.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 *
 * It does not reset passwords and it does not promote existing accounts. Those
 * are separate, explicitly-confirmed operations:
 *
 *   - password recovery → scripts/reset-owner-password.ts (owner accounts only)
 *   - additional owners → the admin UI (/admin/admins), where the app's own
 *     rules and audit trail apply
 *
 * ── EXIT CODES ──────────────────────────────────────────────────────────────
 *
 *   0  owner created
 *   1  refused, safely — nothing was created or modified
 *   2  the input was missing or invalid
 *   3  an unexpected failure (a code is printed; never a message or a secret)
 *
 * The supplied password is never printed, echoed back, or included in any error
 * message. Prefer the environment over a command-line argument: a password
 * typed on the command line also lands in your shell history.
 */
// MUST be the FIRST import. ESM evaluates imports in declaration order, and
// `@/lib/db/prisma` reads `process.env.DATABASE_URL` at MODULE LOAD time to
// build its pg adapter. If dotenv has not run yet, that read yields undefined,
// pg silently falls back to localhost:5432, and the script dies with a
// confusing `ECONNREFUSED` on its first query instead of a missing-variable
// error. (prisma/seed.ts has the same ordering for the same reason.)
import "dotenv/config";

import { bootstrapOwner } from "@/lib/auth/owner-bootstrap";
import { prisma } from "@/lib/db/prisma";

/** First CLI argument that is present and non-empty, else the environment. */
function fromArgsOrEnv(index: number, envName: string): string | undefined {
  return process.argv[index]?.trim() || process.env[envName]?.trim() || undefined;
}

async function main(): Promise<number> {
  const outcome = await bootstrapOwner({
    email: fromArgsOrEnv(2, "OWNER_EMAIL"),
    // NOT trimmed: leading/trailing spaces can be intentional in a passphrase,
    // and silently stripping them would create a password the operator cannot
    // reproduce.
    password: process.argv[3] || process.env.OWNER_PASSWORD || undefined,
    name: fromArgsOrEnv(4, "OWNER_NAME"),
  });

  switch (outcome.status) {
    case "created":
      console.log(`owner created: ${outcome.email}`);
      console.log(
        "Sign in and change this password if it was ever passed on a command line.",
      );
      return 0;

    case "invalid":
      console.error("Refusing to run — the input is not usable:");
      for (const problem of outcome.problems) console.error(`  - ${problem}`);
      console.error(
        "\nNothing was created or modified. See docs/pass-B-owner-bootstrap.md.",
      );
      return 2;

    case "refused-owner-exists":
      console.error(
        `Refusing to run — ${outcome.ownerCount} owner account(s) already exist.`,
      );
      console.error(
        "This script only bootstraps the FIRST owner. To add another, sign in as an\n" +
          "existing owner and use /admin/admins. To recover a lost owner password, use\n" +
          "scripts/reset-owner-password.ts (owner accounts only).",
      );
      console.error("\nNothing was created or modified.");
      return 1;

    case "refused-email-exists":
      console.error(
        `Refusing to run — ${outcome.email} already belongs to an account with the role "${outcome.existingRole}".`,
      );
      console.error(
        "This script never promotes an existing account and never resets its password:\n" +
          "that would turn a mistyped address into an account takeover. Review the account\n" +
          "first. If it should already be an owner, recover its password with\n" +
          "scripts/reset-owner-password.ts. If it needs a different role, sign in as an\n" +
          "owner and use /admin/admins.",
      );
      console.error("\nNothing was created or modified.");
      return 1;

    case "failed":
      console.error(`Failed: ${outcome.message}`);
      return 3;
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  // A code, never a message: a driver error can carry the connection string.
  const label =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : error instanceof Error
        ? error.name
        : "UnknownError";
  console.error(`Failed unexpectedly (${label}). No secrets were printed.`);
  process.exitCode = 3;
} finally {
  await prisma.$disconnect().catch(() => {});
}
