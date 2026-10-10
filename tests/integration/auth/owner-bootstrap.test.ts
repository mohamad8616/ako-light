/**
 * Owner bootstrap — the database half (Pass B).
 *
 * Real database, real better-auth credential writes. No mocks: the whole point
 * of these tests is that the script's refusals happen BEFORE anything is
 * touched, and that the credential it writes can actually sign in.
 *
 * NOTHING here prints a password, a hash or a session token.
 *
 * ── Why some cases call `createOwnerAccount` directly ───────────────────────
 *
 * `bootstrapOwner` refuses when ANY owner already exists, and a development
 * database normally has several — so the bootstrap gate is tested against that
 * real state, and the CREATION mechanics are tested through the ungated
 * `createOwnerAccount` with a throwaway address. That way both halves are
 * covered without deleting anybody's account.
 */
import {
  cleanupFixture,
  closeDb,
  findUser,
  hasDatabaseUrl,
  query,
  setUserFlags,
  uniqueEmail,
} from "@/tests/helpers/auth-db";
import { auth } from "@/lib/auth/auth";
import {
  bootstrapOwner,
  countOwners,
  createOwnerAccount,
  OWNER_BOOTSTRAP_LOCK_KEY,
} from "@/lib/auth/owner-bootstrap";
import { resetOwnerPassword } from "@/lib/auth/owner-password-reset";
import { prisma } from "@/lib/db/prisma";
import { Client } from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";

const describeDb = describe.skipIf(!hasDatabaseUrl);

/** Long enough to pass the input rules, unique per run so nothing collides. */
const PASSWORD = `bootstrap-${"x".repeat(20)}-a1`;
const ROTATED = `rotated-${"y".repeat(20)}-b2`;

const created: { id: string; email: string }[] = [];

/** Creates a signed-up account with `role`, through better-auth's own API. */
async function makeAccount(
  role: "user" | "admin" | "owner",
): Promise<{ id: string; email: string }> {
  const email = uniqueEmail();
  const response = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: email },
  });
  const id = (response as { user?: { id?: string } }).user?.id;
  if (!id) throw new Error("sign-up returned no user id");
  await setUserFlags(id, { role });
  const record = { id, email };
  created.push(record);
  return record;
}

/** True when `password` signs the account in. */
async function passwordWorks(email: string, password: string): Promise<boolean> {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}

describeDb("owner bootstrap", () => {
  afterAll(async () => {
    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ------------------------------------------------------------------ */
  /* The bootstrap gate — against the REAL state of this database        */
  /* ------------------------------------------------------------------ */

  it("refuses when an owner already exists, and creates nothing", async () => {
    const owners = await countOwners();
    if (owners === 0) {
      // A fresh database: the gate cannot be exercised here. Say so loudly
      // rather than passing vacuously.
      throw new Error(
        "expected this database to already contain at least one owner; the owner-exists gate cannot be verified against an empty one",
      );
    }

    const email = uniqueEmail();
    const outcome = await bootstrapOwner({
      email,
      password: PASSWORD,
      name: undefined,
    });

    expect(outcome).toEqual({ status: "refused-owner-exists", ownerCount: owners });
    expect(await findUser(await idForEmail(email)), "no account may be created").toBeNull();
  });

  it("refuses an existing ADMIN email without promoting it", async () => {
    const admin = await makeAccount("admin");

    const outcome = await bootstrapOwner({
      email: admin.email,
      password: PASSWORD,
      name: undefined,
    });

    expect(outcome).toMatchObject({
      status: "refused-email-exists",
      existingRole: "admin",
    });
    expect((await findUser(admin.id))?.role, "must not be promoted").toBe("admin");
  });

  it("refuses an existing USER email without promoting it", async () => {
    const user = await makeAccount("user");

    const outcome = await bootstrapOwner({
      email: user.email,
      password: PASSWORD,
      name: undefined,
    });

    expect(outcome).toMatchObject({
      status: "refused-email-exists",
      existingRole: "user",
    });
    expect((await findUser(user.id))?.role, "must not be promoted").toBe("user");
  });

  it("refuses an existing OWNER email without resetting its password", async () => {
    // The account-takeover case: the old script would have overwritten this
    // password with whatever was on the command line.
    const owner = await makeAccount("owner");

    const outcome = await bootstrapOwner({
      email: owner.email,
      password: ROTATED,
      name: undefined,
    });

    expect(outcome).toMatchObject({ status: "refused-email-exists" });
    expect((await findUser(owner.id))?.role).toBe("owner");
    expect(
      await passwordWorks(owner.email, PASSWORD),
      "the original password must still work",
    ).toBe(true);
    expect(await passwordWorks(owner.email, ROTATED)).toBe(false);
  });

  it("normalises the email so a different case cannot create a duplicate", async () => {
    const user = await makeAccount("user");

    const outcome = await bootstrapOwner({
      email: user.email.toUpperCase(),
      password: PASSWORD,
      name: undefined,
    });

    expect(outcome).toMatchObject({ status: "refused-email-exists" });
  });

  it("refuses invalid input before touching the database", async () => {
    const outcome = await bootstrapOwner({
      email: undefined,
      password: undefined,
      name: undefined,
    });

    expect(outcome.status).toBe("invalid");
  });

  /* ------------------------------------------------------------------ */
  /* Creation mechanics — the ungated path                               */
  /* ------------------------------------------------------------------ */

  it("creates a working owner account", async () => {
    const email = uniqueEmail();

    const outcome = await createOwnerAccount({
      email,
      password: PASSWORD,
      name: "Bootstrap Test",
    });

    expect(outcome).toMatchObject({ status: "created", email });
    if (outcome.status !== "created") return;
    created.push({ id: outcome.userId, email });

    const row = await findUser(outcome.userId);
    expect(row?.role).toBe("owner");
    expect(row?.name).toBe("Bootstrap Test");
    // The decisive check: the credential really authenticates.
    expect(await passwordWorks(email, PASSWORD)).toBe(true);
  });

  it("fails safely on a duplicate email instead of creating a second account", async () => {
    const first = await createOwnerAccount({
      email: uniqueEmail(),
      password: PASSWORD,
      name: "First",
    });
    if (first.status !== "created") throw new Error("setup failed");
    created.push({ id: first.userId, email: first.email });

    const second = await createOwnerAccount({
      email: first.email,
      password: ROTATED,
      name: "Second",
    });

    expect(second.status).toBe("failed");
    if (second.status !== "failed") return;
    // No secret, and no raw driver text, in the failure message.
    expect(second.message).not.toContain(PASSWORD);
    expect(second.message).not.toContain(ROTATED);
    expect(second.message).not.toMatch(/postgres(ql)?:\/\//);

    // Still exactly one account, with the ORIGINAL credential.
    expect(await passwordWorks(first.email, PASSWORD)).toBe(true);
    expect(await passwordWorks(first.email, ROTATED)).toBe(false);
  });

  /* ------------------------------------------------------------------ */
  /* Concurrency                                                         */
  /* ------------------------------------------------------------------ */

  it("serialises concurrent bootstrap runs — no duplicate owner for one email", async () => {
    const email = uniqueEmail();

    const outcomes = await Promise.all([
      bootstrapOwner({ email, password: PASSWORD, name: undefined }),
      bootstrapOwner({ email, password: PASSWORD, name: undefined }),
    ]);

    // Both must reach a decision without erroring; neither may create an owner
    // while one already exists.
    for (const outcome of outcomes) {
      expect(["refused-owner-exists", "refused-email-exists"]).toContain(
        outcome.status,
      );
    }
    expect(await findUser(await idForEmail(email))).toBeNull();
  });

  it("serialises concurrent CREATION — exactly one account for one email", async () => {
    // The ungated path, so the race is actually reachable: both calls try to
    // create the same address. `User.email` is @unique, so the database — not a
    // findFirst() — is what decides.
    const email = uniqueEmail();

    const results = await Promise.all([
      createOwnerAccount({ email, password: PASSWORD, name: "Race A" }),
      createOwnerAccount({ email, password: PASSWORD, name: "Race B" }),
    ]);

    const createdCount = results.filter((r) => r.status === "created").length;
    expect(createdCount, "exactly one caller may win").toBe(1);

    const winner = results.find((r) => r.status === "created");
    if (winner && winner.status === "created") {
      created.push({ id: winner.userId, email });
    }

    const loser = results.find((r) => r.status === "failed");
    expect(loser?.status).toBe("failed");
    if (loser && loser.status === "failed") {
      expect(loser.message).not.toContain(PASSWORD);
    }

    expect(await passwordWorks(email, PASSWORD)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Recovery — a separate operation, owner accounts only                */
  /* ------------------------------------------------------------------ */

  it("resets an existing OWNER's password when explicitly confirmed", async () => {
    const owner = await makeAccount("owner");

    const outcome = await resetOwnerPassword({
      email: owner.email,
      password: ROTATED,
      confirmed: true,
    });

    expect(outcome).toMatchObject({ status: "reset", email: owner.email });
    expect(await passwordWorks(owner.email, ROTATED)).toBe(true);
    expect(await passwordWorks(owner.email, PASSWORD)).toBe(false);
  });

  it("refuses to reset without explicit confirmation", async () => {
    const owner = await makeAccount("owner");

    const outcome = await resetOwnerPassword({
      email: owner.email,
      password: ROTATED,
      confirmed: false,
    });

    expect(outcome.status).toBe("refused-not-confirmed");
    expect(
      await passwordWorks(owner.email, PASSWORD),
      "the original password must be untouched",
    ).toBe(true);
  });

  it("NEVER promotes: recovery refuses a user and an admin", async () => {
    const user = await makeAccount("user");
    const admin = await makeAccount("admin");

    for (const account of [user, admin]) {
      const outcome = await resetOwnerPassword({
        email: account.email,
        password: ROTATED,
        confirmed: true,
      });
      expect(outcome, account.email).toMatchObject({
        status: "refused-not-owner",
      });
    }

    expect((await findUser(user.id))?.role).toBe("user");
    expect((await findUser(admin.id))?.role).toBe("admin");
    // And their passwords are untouched.
    expect(await passwordWorks(user.email, PASSWORD)).toBe(true);
    expect(await passwordWorks(admin.email, PASSWORD)).toBe(true);
  });

  it("NEVER creates: recovery refuses an unknown address", async () => {
    const email = uniqueEmail();

    const outcome = await resetOwnerPassword({
      email,
      password: ROTATED,
      confirmed: true,
    });

    expect(outcome).toMatchObject({ status: "refused-not-found" });
    expect(await findUser(await idForEmail(email))).toBeNull();
  });

  it("exposes a stable advisory-lock key", () => {
    expect(Number.isSafeInteger(OWNER_BOOTSTRAP_LOCK_KEY)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Email casing — the lookup must not be case-sensitive                */
  /* ------------------------------------------------------------------ */

  it("refuses a MIXED-CASE existing email, not just a lower-case one", async () => {
    // better-auth always stores lower-case (`createUser` does
    // `email.toLowerCase()`), so a mixed-case ROW can only arrive from a direct
    // DB write — a seed, an import, or manual SQL. A case-SENSITIVE lookup would
    // miss it, sign-up would then store a second row under the lower-cased
    // address, and that new row would be the owner: two accounts for one person.
    const mixed = `Mixed.Case.${Date.now()}@Example.Test`;
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role, banned, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, 'user', false, now(), now())`,
      [id, "Mixed Case", mixed],
    );
    created.push({ id, email: mixed });

    const outcome = await bootstrapOwner({
      email: mixed.toLowerCase(),
      password: PASSWORD,
      name: undefined,
    });

    expect(outcome).toMatchObject({ status: "refused-email-exists" });

    // And nothing new was written for that address, in any casing.
    const rows = await query<{ n: number }>(
      'SELECT count(*)::int AS n FROM "user" WHERE lower(email) = lower($1)',
      [mixed],
    );
    expect(rows[0].n, "exactly one account may exist per address").toBe(1);
  });

  /* ------------------------------------------------------------------ */
  /* The advisory lock — held across the checks, released either way      */
  /* ------------------------------------------------------------------ */

  it("holds the lock BEFORE the existence checks, and releases it after", async () => {
    // Block the FIRST statement inside the lock-protected section, and signal
    // when that statement has been REACHED. Waiting for the signal (rather than
    // probing immediately) is what makes this deterministic: `bootstrapOwner`
    // returns its promise before the lock connection has even finished
    // connecting, so an immediate probe races the acquisition.
    const original = prisma.user.findFirst.bind(prisma.user);
    let release!: () => void;
    let reachedCheck!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const checkReached = new Promise<void>((resolve) => {
      reachedCheck = resolve;
    });

    // The cast is needed because a Prisma delegate returns `Prisma__UserClient`
    // (a thenable), not a plain `Promise`; the async wrapper below resolves to
    // the same value the caller awaits.
    const spy = vi.spyOn(prisma.user, "findFirst");
    spy.mockImplementation((async (
      ...args: Parameters<typeof original>
    ) => {
      reachedCheck();
      await gate;
      return original(...args);
    }) as typeof original);

    const pending = bootstrapOwner({
      email: uniqueEmail(),
      password: PASSWORD,
      name: undefined,
    });

    try {
      await checkReached;
      expect(
        await lockIsHeld(),
        "the lock must be held while the existence check is still running",
      ).toBe(true);
    } finally {
      release();
    }

    const outcome = await pending;
    spy.mockRestore();

    expect(["refused-owner-exists", "refused-email-exists"]).toContain(
      outcome.status,
    );
    expect(await lockIsHeld(), "released on the success path").toBe(false);
  });

  it("releases the lock when the operation throws", async () => {
    const spy = vi
      .spyOn(prisma.user, "findFirst")
      .mockRejectedValue(new Error("simulated failure"));

    const outcome = await bootstrapOwner({
      email: uniqueEmail(),
      password: PASSWORD,
      name: undefined,
    });
    spy.mockRestore();

    expect(outcome.status).toBe("failed");
    expect(await lockIsHeld(), "released on the failure path").toBe(false);
  });

  /* ------------------------------------------------------------------ */
  /* Compensation — it may delete ONLY what this invocation created      */
  /* ------------------------------------------------------------------ */

  it("deletes ONLY the account it just created when the role write fails", async () => {
    // A pre-existing, unrelated account that must survive untouched.
    const bystander = await makeAccount("user");
    const email = uniqueEmail();

    const spy = vi
      .spyOn(prisma.user, "update")
      .mockRejectedValueOnce(new Error("simulated role-write failure"));
    const outcome = await createOwnerAccount({
      email,
      password: PASSWORD,
      name: "Doomed",
    });
    spy.mockRestore();

    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.message).not.toContain(PASSWORD);
    }

    // The half-made account is gone...
    expect(await findUser(await idForEmail(email))).toBeNull();
    // ...and the bystander is untouched, in role AND credential.
    expect((await findUser(bystander.id))?.role).toBe("user");
    expect(await passwordWorks(bystander.email, PASSWORD)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Recovery — scope and session invalidation                           */
  /* ------------------------------------------------------------------ */

  it("changes ONLY the intended owner's password", async () => {
    const target = await makeAccount("owner");
    const other = await makeAccount("owner");

    const outcome = await resetOwnerPassword({
      email: target.email,
      password: ROTATED,
      confirmed: true,
    });
    expect(outcome).toMatchObject({ status: "reset" });

    expect(await passwordWorks(target.email, ROTATED)).toBe(true);
    // The OTHER owner is untouched — role and credential both.
    expect((await findUser(other.id))?.role).toBe("owner");
    expect(await passwordWorks(other.email, PASSWORD)).toBe(true);
  });

  it("invalidates the owner's existing sessions on reset", async () => {
    const owner = await makeAccount("owner");

    // A live session, exactly as a signed-in owner would have.
    await auth.api.signInEmail({
      body: { email: owner.email, password: PASSWORD },
    });
    const before = await query<{ n: number }>(
      'SELECT count(*)::int AS n FROM session WHERE "userId" = $1',
      [owner.id],
    );
    expect(before[0].n, "the setup must have created a session").toBeGreaterThan(
      0,
    );

    const outcome = await resetOwnerPassword({
      email: owner.email,
      password: ROTATED,
      confirmed: true,
    });
    expect(outcome).toMatchObject({ status: "reset" });

    const after = await query<{ n: number }>(
      'SELECT count(*)::int AS n FROM session WHERE "userId" = $1',
      [owner.id],
    );
    expect(after[0].n, "existing sessions must be invalidated").toBe(0);
  });
});

/**
 * True when ANOTHER session currently holds the bootstrap advisory lock.
 *
 * Probes from a dedicated connection: `pg_try_advisory_lock` takes the lock when
 * it is free, so the answer is inverted — and the lock is released immediately
 * when this probe did take it, so the probe itself never blocks the code under
 * test.
 */
async function lockIsHeld(): Promise<boolean> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ got: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS got",
      [OWNER_BOOTSTRAP_LOCK_KEY],
    );
    const got = rows[0].got === true;
    if (got) {
      await client.query("SELECT pg_advisory_unlock($1)", [
        OWNER_BOOTSTRAP_LOCK_KEY,
      ]);
    }
    return !got;
  } finally {
    await client.end().catch(() => {});
  }
}

/** The id for an email, or a sentinel that `findUser` will not resolve. */
async function idForEmail(email: string): Promise<string> {
  const { query } = await import("@/tests/helpers/auth-db");
  const rows = await query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1',
    [email],
  );
  return rows[0]?.id ?? "00000000-0000-0000-0000-000000000000";
}
