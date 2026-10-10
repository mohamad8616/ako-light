/**
 * Recover an EXISTING owner's password (Pass B) — a separate operation from
 * bootstrap, and never a way to create or promote an owner.
 *
 *   OWNER_EMAIL=you@example.com OWNER_NEW_PASSWORD='<new passphrase>' \
 *     pnpm reset:owner-password --confirm-reset
 *
 *   pnpm reset:owner-password you@example.com '<new passphrase>' --confirm-reset
 *
 * ── WHY A SEPARATE SCRIPT ───────────────────────────────────────────────────
 *
 * The old bootstrap script reset the password of any account matching the email,
 * in ANY role, with no confirmation. A single mistyped address was therefore an
 * account takeover. Recovery still has to exist — the admin UI needs a signed-in
 * owner, so a locked-out owner would otherwise be unrecoverable — but it is
 * narrowed to the only case that is actually recovery:
 *
 *   - the account must already exist;
 *   - it must ALREADY be an owner (a customer or an admin is refused, never
 *     promoted);
 *   - `--confirm-reset` must be passed, because this invalidates a live
 *     credential.
 *
 * `--confirm-reset` is not a bypass: there is nothing to bypass. It is the
 * acknowledgement that a different, destructive operation was asked for by name.
 *
 * ── EXIT CODES ──────────────────────────────────────────────────────────────
 *
 *   0  password reset
 *   1  refused, safely — nothing was modified
 *   2  the input was missing or invalid
 *   3  an unexpected failure (a code is printed; never a message or a secret)
 *
 * The new password is never printed, echoed back, or included in an error.
 */
// MUST be the first import — see the note in scripts/create-owner.ts.
import "dotenv/config";

import { resetOwnerPassword } from "@/lib/auth/owner-password-reset";
import { prisma } from "@/lib/db/prisma";

const CONFIRM_FLAG = "--confirm-reset";

async function main(): Promise<number> {
  const positional = process.argv
    .slice(2)
    .filter((value) => !value.startsWith("--"));

  const email = positional[0]?.trim() || process.env.OWNER_EMAIL?.trim() || undefined;
  // Not trimmed: spaces can be intentional in a passphrase.
  const password = positional[1] || process.env.OWNER_NEW_PASSWORD || undefined;

  const outcome = await resetOwnerPassword({
    email,
    password,
    confirmed: process.argv.includes(CONFIRM_FLAG),
  });

  switch (outcome.status) {
    case "reset":
      console.log(`password reset for owner: ${outcome.email}`);
      return 0;

    case "invalid":
      console.error("Refusing to run — the input is not usable:");
      for (const problem of outcome.problems) console.error(`  - ${problem}`);
      console.error("\nNothing was modified. See docs/pass-B-owner-bootstrap.md.");
      return 2;

    case "refused-not-confirmed":
      console.error(
        `Refusing to run — pass ${CONFIRM_FLAG} to confirm you intend to replace an existing owner's password.`,
      );
      console.error(
        "This invalidates the current credential and signs the owner out everywhere.",
      );
      console.error("\nNothing was modified.");
      return 1;

    case "refused-not-found":
      console.error(
        `Refusing to run — no account exists for ${outcome.email}.`,
      );
      console.error(
        "This script never creates an account. Use scripts/create-owner.ts to bootstrap the first owner.",
      );
      console.error("\nNothing was modified.");
      return 1;

    case "refused-not-owner":
      console.error(
        `Refusing to run — ${outcome.email} has the role "${outcome.actualRole}", not "owner".`,
      );
      console.error(
        "Recovery never promotes an account. If this account should be an owner, sign in\n" +
          "as an owner and use /admin/admins.",
      );
      console.error("\nNothing was modified.");
      return 1;

    case "failed":
      console.error(`Failed: ${outcome.message}`);
      return 3;
  }
}

try {
  process.exitCode = await main();
} catch (error) {
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
