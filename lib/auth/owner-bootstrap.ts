/**
 * Owner bootstrap — the database half (Pass B).
 *
 * SERVER-ONLY: it reaches the Prisma client and better-auth's server API.
 * The pure input rules live in lib/auth/owner-bootstrap-input.ts.
 *
 * ── WHAT THIS SCRIPT IS, AND IS NOT ─────────────────────────────────────────
 *
 * It is a BOOTSTRAP: it creates the first owner account, once, from a terminal.
 * It is NOT a recovery tool and NOT a bulk role editor. Those are the two things
 * the previous version quietly did, and both were dangerous:
 *
 *   - an existing account with that email was PROMOTED to owner (a normal user
 *     became the highest-privilege account), and
 *   - its PASSWORD WAS OVERWRITTEN with whatever was on the command line.
 *
 * So a single mistyped email could take over an existing account. Both are gone:
 * an existing email is now a hard stop, and password recovery is a separate,
 * explicitly-confirmed operation (scripts/reset-owner-password.ts).
 *
 * ── HOW THE PASSWORD IS STORED ──────────────────────────────────────────────
 *
 * Better Auth never keeps a plaintext password on `User`. It writes a hash into
 * the `Account` row for the `credential` provider, and it owns the hashing
 * parameters. A hand-written INSERT would produce a row that LOOKS right and can
 * never sign in. `auth.api.signUpEmail` is therefore the only creation path used
 * here — exactly the path a real sign-up takes.
 *
 * ── OWNER UNIQUENESS: WHAT THE PROJECT ACTUALLY SUPPORTS ────────────────────
 *
 * The app supports MULTIPLE owners, deliberately:
 *   - `assignableRoles(owner, user)` returns `[admin, owner]`
 *     (lib/admin/user-directory-permissions.ts), so an owner can mint another;
 *   - the same module documents "an owner may never modify another owner",
 *     which only makes sense with more than one;
 *   - `prisma/schema.prisma` puts no constraint on `role`, and the dev database
 *     already holds several owners.
 *
 * A partial unique index on `role = 'owner'` would therefore be a POLICY CHANGE
 * that breaks a supported flow, so no schema change is made. What this script
 * enforces instead is the invariant that actually matters and that the database
 * CAN guarantee: one account per email (`User.email` is `@unique`), and never a
 * promotion. The owner-exists check is a bootstrap precondition, not an
 * app-wide limit.
 */

import {
  parseOwnerBootstrapInput,
  type OwnerBootstrapInput,
  type ValidOwnerBootstrapInput,
} from "@/lib/auth/owner-bootstrap-input";
import { auth } from "@/lib/auth/auth";
import { ROLES, type AppRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { Client } from "pg";

/**
 * Advisory-lock key. Any 64-bit integer works; it only has to be stable and
 * unlikely to collide with another lock in this database.
 */
export const OWNER_BOOTSTRAP_LOCK_KEY = 8_140_210_001;

/** What happened. A discriminated union, so the CLI maps it to an exit code. */
export type OwnerBootstrapOutcome =
  | { status: "created"; userId: string; email: string }
  | { status: "invalid"; problems: string[] }
  | { status: "refused-email-exists"; email: string; existingRole: AppRole }
  | { status: "refused-owner-exists"; ownerCount: number }
  | { status: "failed"; message: string };

/**
 * The role of an existing account, normalised to the three the app knows.
 *
 * A hand-edited or unknown value is reported as `user` so a message can never
 * claim an account is more privileged than the app treats it.
 */
function normaliseRole(value: string | null | undefined): AppRole {
  return value === ROLES.owner || value === ROLES.admin ? value : ROLES.user;
}

/**
 * A short, safe label for an error — a code, never a message.
 *
 * Prisma's connection errors embed the host and sometimes the URL, and a raw
 * driver error can carry the whole connection string. Only the machine-readable
 * code is surfaced, so a failed run cannot print a credential to the terminal or
 * a CI log.
 */
function safeErrorLabel(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z0-9_]+$/.test(code)) return code;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

/**
 * Serialises concurrent bootstrap runs for the length of `fn`.
 *
 * A `findFirst()`-then-create check races: two runs can both see "no owner" and
 * both proceed. The database's `@unique([email])` stops a DUPLICATE ACCOUNT, but
 * it cannot stop two different emails from both passing the owner check. A
 * session-scoped advisory lock held on a dedicated connection makes the whole
 * check-and-create sequence atomic across processes, with no schema change.
 *
 * The lock is always released, including on a thrown error; the dedicated
 * connection is closed either way so a failed run cannot leak a connection.
 */
async function withBootstrapLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [OWNER_BOOTSTRAP_LOCK_KEY]);
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [
        OWNER_BOOTSTRAP_LOCK_KEY,
      ]);
    } catch {
      /* the connection may already be gone; closing it releases the lock */
    }
    await client.end().catch(() => {});
  }
}

/** How many owner accounts exist. */
export async function countOwners(): Promise<number> {
  return prisma.user.count({ where: { role: ROLES.owner } });
}

/**
 * Signs in with the credential that was just written, then removes the session
 * the check created.
 *
 * Returns `false` when the credential cannot authenticate. The response body and
 * any token are never read, logged or returned — only the status code.
 */
async function verifyCredential(
  input: ValidOwnerBootstrapInput,
): Promise<boolean> {
  try {
    const response = (await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      asResponse: true,
    })) as unknown as Response;

    // The session exists only because of this check, so drop it again.
    await prisma.session.deleteMany({
      where: { user: { email: input.email } },
    });

    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Creates the account and gives it the owner role — the creation mechanics
 * only, with NO policy gate.
 *
 * Exported so the creation path can be tested directly on a database that
 * already has owners (which is the normal state of a development database, and
 * the state in which the bootstrap gate legitimately refuses to run).
 *
 * PARTIAL FAILURE: sign-up and the role write cannot share a transaction —
 * better-auth owns its own connection — so if the role write fails the freshly
 * created account is REMOVED (its `Account` and `Session` rows cascade). A
 * failed run therefore leaves no half-made owner behind.
 */
export async function createOwnerAccount(
  input: ValidOwnerBootstrapInput,
): Promise<OwnerBootstrapOutcome> {
  let response: Response;
  try {
    response = (await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
      asResponse: true,
    })) as unknown as Response;
  } catch (error) {
    return {
      status: "failed",
      message: `sign-up threw before creating the account (${safeErrorLabel(error)}).`,
    };
  }

  if (response.status !== 200) {
    return {
      status: "failed",
      message: `sign-up was rejected (HTTP ${response.status}). The account was not created.`,
    };
  }

  try {
    const updated = await prisma.user.update({
      where: { email: input.email },
      data: { role: ROLES.owner },
      select: { id: true },
    });

    // Prove the credential actually works. A row that exists but cannot sign in
    // is precisely the failure mode this script exists to prevent, and it is
    // invisible until the owner tries to log in. The session the check creates
    // is deleted immediately, so a bootstrap does not leave a live session
    // behind for an account nobody has used yet.
    const credentialWorks = await verifyCredential(input);
    if (!credentialWorks) {
      return {
        status: "failed",
        message:
          "the owner account was created but its credential could not sign in. " +
          "Delete the account and re-run before relying on it.",
      };
    }

    return { status: "created", userId: updated.id, email: input.email };
  } catch (error) {
    // Undo, so the operator is never left with an account they did not ask for.
    let rolledBack = false;
    try {
      await prisma.user.delete({ where: { email: input.email } });
      rolledBack = true;
    } catch {
      rolledBack = false;
    }
    return {
      status: "failed",
      message:
        `the account was created but could not be given the owner role (${safeErrorLabel(error)}). ` +
        (rolledBack
          ? "The partial account was removed."
          : "The partial account could NOT be removed — review the user table before re-running."),
    };
  }
}

/**
 * The bootstrap entry point: validate, take the lock, check, create.
 *
 * Refuses — without touching anything — when:
 *   - the input is missing or weak;
 *   - an owner already exists (bootstrap is done; use the admin UI for another);
 *   - the email already belongs to an account, in ANY role (never promoted).
 */
export async function bootstrapOwner(
  raw: OwnerBootstrapInput,
): Promise<OwnerBootstrapOutcome> {
  const parsed = parseOwnerBootstrapInput(raw);
  if (!parsed.ok) return { status: "invalid", problems: parsed.problems };
  const input = parsed.value;

  try {
    return await withBootstrapLock(async () => {
      // The EMAIL check runs first because it is the more specific answer: an
      // operator who mistyped an existing address needs to hear that, not "an
      // owner already exists". Both gates refuse without touching anything.
      //
      // `mode: "insensitive"` is load-bearing. Postgres compares `=` case-
      // SENSITIVELY, and better-auth's own `findUserByEmail` is a plain equality
      // too — so a case-sensitive lookup would MISS a mixed-case row, fall
      // through to sign-up, and store a SECOND account under the lower-cased
      // address, which would then be the owner. better-auth lower-cases on
      // create (`internal-adapter` `createUser`), so a mixed-case row can only
      // come from a direct DB write (a seed, an import, manual SQL) — exactly
      // the case a bootstrap must not turn into a duplicate.
      const existing = await prisma.user.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { role: true },
      });
      if (existing) {
        return {
          status: "refused-email-exists",
          email: input.email,
          existingRole: normaliseRole(existing.role),
        } as const;
      }

      const ownerCount = await countOwners();
      if (ownerCount > 0) {
        return { status: "refused-owner-exists", ownerCount } as const;
      }

      return createOwnerAccount(input);
    });
  } catch (error) {
    // The lock connection itself can fail; report a code, never the message.
    return {
      status: "failed",
      message: `could not complete the bootstrap (${safeErrorLabel(error)}).`,
    };
  }
}
