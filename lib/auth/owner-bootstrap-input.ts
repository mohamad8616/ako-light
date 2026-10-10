/**
 * Input rules for the owner bootstrap script (Pass B).
 *
 * PURE — no prisma, no better-auth, no `process`. That is deliberate: these are
 * the rules that decide whether the script is allowed to touch the database at
 * all, and they must be unit-testable without a connection. The database half
 * lives in lib/auth/owner-bootstrap.ts.
 *
 * ── Why the defaults had to go ──────────────────────────────────────────────
 *
 * The script used to fall back to a fixed email and password committed to this
 * repository, so `pnpm create:owner` with no arguments would happily mint a
 * full-privilege owner whose password anyone with repository access already
 * knew. A missing variable must stop the run, not pick a credential for you.
 *
 * ── Why the minimum is 12 and not better-auth's 8 ───────────────────────────
 *
 * `emailAndPassword.minPasswordLength` defaults to 8 in better-auth
 * (`context/create-context.mjs`), and that is the floor the SIGN-UP endpoint
 * enforces. This script is the highest-privilege account in the system and is
 * created once, by hand, from a terminal — so it holds a stricter floor. The
 * retired default is only 8 characters, so the length rule rejects it on its
 * own — which is why it is not repeated as a literal anywhere in this
 * repository (see the scan in tests/unit/auth/owner-bootstrap-input.test.ts).
 *
 * A rejected password is NEVER echoed back, and no problem message contains it.
 */

/** The shortest password this script will accept for an owner account. */
export const OWNER_PASSWORD_MIN_LENGTH = 12;

/** An upper bound, so a pasted blob cannot become a denial-of-service. */
export const OWNER_PASSWORD_MAX_LENGTH = 128;

/**
 * Values that must never become the owner password: generic placeholders and
 * the famous xkcd passphrase (which is only famous BECAUSE it is in every
 * password wordlist).
 *
 * The retired hardcoded default is deliberately NOT listed here. It is 8
 * characters, so the minimum-length rule already rejects it, and keeping the
 * literal out of the source is itself a requirement of this pass — see
 * tests/unit/auth/owner-bootstrap-input.test.ts, which scans these files for it.
 * Compared case-insensitively.
 */
const REJECTED_PASSWORDS: readonly string[] = [
  "password",
  "password123",
  "changeme",
  "changeme123",
  "admin123",
  "letmein",
  "qwertyuiop",
  "correcthorsebatterystaple",
];

/** Deliberately permissive: a shape check, not an RFC 5322 parser. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The raw values the CLI collected from arguments and the environment. */
export interface OwnerBootstrapInput {
  email: string | undefined;
  password: string | undefined;
  name: string | undefined;
}

/** The validated values, ready to hand to the database half. */
export interface ValidOwnerBootstrapInput {
  email: string;
  password: string;
  name: string;
}

/**
 * Every problem with the input, in a stable order. An empty array means the
 * input is usable.
 *
 * Messages name the VARIABLE, never the value, so a message can be logged or
 * pasted into a ticket without leaking anything.
 */
export function validateOwnerBootstrapInput(
  input: OwnerBootstrapInput,
): string[] {
  const problems: string[] = [];

  const email = input.email?.trim() ?? "";
  const password = input.password ?? "";

  if (!email) {
    problems.push(
      "OWNER_EMAIL is required (or pass the email as the first argument). There is no default: a bootstrap owner must be named explicitly.",
    );
  } else if (!EMAIL_SHAPE.test(email)) {
    problems.push(
      "OWNER_EMAIL is not a valid email address (expected something like name@example.com).",
    );
  }

  if (!password) {
    problems.push(
      "OWNER_PASSWORD is required (or pass it as the second argument). There is no default.",
    );
  } else {
    if (password.length < OWNER_PASSWORD_MIN_LENGTH) {
      problems.push(
        `OWNER_PASSWORD must be at least ${OWNER_PASSWORD_MIN_LENGTH} characters.`,
      );
    }
    if (password.length > OWNER_PASSWORD_MAX_LENGTH) {
      problems.push(
        `OWNER_PASSWORD must be at most ${OWNER_PASSWORD_MAX_LENGTH} characters.`,
      );
    }
    if (REJECTED_PASSWORDS.includes(password.toLowerCase())) {
      problems.push(
        "OWNER_PASSWORD is a well-known or previously hardcoded value. Choose a unique passphrase.",
      );
    }
    // A password containing the account's own name is guessable from the login
    // form's first field.
    const localPart = email.split("@")[0]?.toLowerCase() ?? "";
    if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
      problems.push(
        "OWNER_PASSWORD must not contain the email address's local part.",
      );
    }
  }

  return problems;
}

/**
 * Trims and normalises the input, or returns the problems that block it.
 *
 * The email is lowercased: `User.email` is `@unique`, and Postgres compares it
 * case-SENSITIVELY, so `Owner@example.com` and `owner@example.com` are two
 * different rows. Normalising here is what stops a second bootstrap run from
 * creating a duplicate account for the same person.
 */
export function parseOwnerBootstrapInput(
  input: OwnerBootstrapInput,
):
  | { ok: true; value: ValidOwnerBootstrapInput }
  | { ok: false; problems: string[] } {
  const problems = validateOwnerBootstrapInput(input);
  if (problems.length > 0) return { ok: false, problems };

  const email = input.email!.trim().toLowerCase();
  const name =
    input.name?.trim() ||
    email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return { ok: true, value: { email, password: input.password!, name } };
}
