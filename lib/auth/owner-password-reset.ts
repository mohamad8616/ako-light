/**
 * Owner password recovery — a SEPARATE, explicitly-confirmed operation (Pass B).
 *
 * ── WHY IT IS SEPARATE ──────────────────────────────────────────────────────
 *
 * The old bootstrap script reset the password of whatever account matched the
 * supplied email, in any role. That is an account takeover waiting for a typo,
 * so it was removed. But removing it without a replacement would leave an owner
 * who forgets their password with no way back in — the admin UI needs a signed-in
 * owner. So recovery exists, and it is deliberately narrow:
 *
 *   - the account must ALREADY exist — this never creates one;
 *   - the account must ALREADY hold the `owner` role — this never promotes one,
 *     so it can never be used to escalate a customer or an admin;
 *   - it must be explicitly confirmed, because it invalidates a live credential;
 *   - the new password is held to the same strength rules as bootstrap.
 *
 * It is not reachable from the bootstrap script and shares none of its flags.
 *
 * ── HOW THE HASH IS WRITTEN ─────────────────────────────────────────────────
 *
 * `hashPassword` from `better-auth/crypto` — better-auth's own function, so the
 * value is byte-for-byte the format `signInEmail` recomputes. The credential row
 * is `providerId: "credential"` + `accountId: userId`, the shape better-auth
 * looks up on sign-in.
 */

import {
  validateOwnerBootstrapInput,
  type ValidOwnerBootstrapInput,
} from "@/lib/auth/owner-bootstrap-input";
import { auth } from "@/lib/auth/auth";
import { ROLES, type AppRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "better-auth/crypto";

/** What happened. A discriminated union, so the CLI maps it to an exit code. */
export type OwnerPasswordResetOutcome =
  | { status: "reset"; email: string }
  | { status: "invalid"; problems: string[] }
  | { status: "refused-not-confirmed" }
  | { status: "refused-not-found"; email: string }
  | { status: "refused-not-owner"; email: string; actualRole: AppRole }
  | { status: "failed"; message: string };

/** Same rule as bootstrap: a code, never a message that could carry a secret. */
function safeErrorLabel(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z0-9_]+$/.test(code)) return code;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

/**
 * Writes the credential hash for an existing user.
 *
 * `providerId: "credential"` + `accountId: userId` is the shape better-auth looks
 * up on sign-in. This schema has no unique index covering those two columns, so
 * the row is found first and then updated or created.
 */
async function setCredentialPassword(
  userId: string,
  password: string,
): Promise<"updated" | "created"> {
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

/** Signs in to prove the new credential works, then drops the session it made. */
async function verifyCredential(
  input: ValidOwnerBootstrapInput,
): Promise<boolean> {
  try {
    const response = (await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      asResponse: true,
    })) as unknown as Response;

    // The session exists only because of this check, and a password reset
    // should not leave a live session behind for whoever runs the script.
    await prisma.session.deleteMany({
      where: { user: { email: input.email } },
    });

    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Resets an EXISTING owner's password.
 *
 * `confirmed` must be true; the CLI only sets it from an explicit flag. A caller
 * that forgets it gets a refusal rather than a silent reset.
 */
export async function resetOwnerPassword(raw: {
  email: string | undefined;
  password: string | undefined;
  confirmed: boolean;
}): Promise<OwnerPasswordResetOutcome> {
  const problems = validateOwnerBootstrapInput({
    email: raw.email,
    password: raw.password,
    name: undefined,
  });
  if (problems.length > 0) return { status: "invalid", problems };

  if (!raw.confirmed) return { status: "refused-not-confirmed" };

  const email = raw.email!.trim().toLowerCase();
  const password = raw.password!;

  try {
    // Case-insensitive for the same reason as the bootstrap gate: Postgres
    // compares `=` case-sensitively, so a mixed-case row (which only a direct
    // DB write can produce) would otherwise be reported as "no such account"
    // and the operator would be told to bootstrap — creating a duplicate.
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, role: true, email: true },
    });

    if (!user) return { status: "refused-not-found", email };

    // The load-bearing rule: recovery can never create an owner.
    if (user.role !== ROLES.owner) {
      return {
        status: "refused-not-owner",
        email,
        actualRole:
          user.role === ROLES.admin ? ROLES.admin : ROLES.user,
      };
    }

    await setCredentialPassword(user.id, password);

    // Verify with the STORED casing. better-auth's `findUserByEmail` is a plain
    // equality, so signing in with the operator's casing would fail for a
    // mixed-case row even though the password was just written correctly — and
    // the operator would be told the reset failed when it had not.
    const works = await verifyCredential({
      email: user.email,
      password,
      name: "",
    });
    if (!works) {
      return {
        status: "failed",
        message:
          "the credential was written but could not sign in. The account's previous password is no longer valid — re-run this script.",
      };
    }

    return { status: "reset", email };
  } catch (error) {
    return {
      status: "failed",
      message: `the reset could not be completed (${safeErrorLabel(error)}).`,
    };
  }
}
