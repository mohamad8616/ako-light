/**
 * Fixture harness for the authentication tier (`tests/integration/auth/`).
 *
 * Why this exists instead of reusing `tests/helpers/db.ts`:
 *
 *  - The auth tests must exercise the REAL HTTP surface that the browser talks
 *    to — `app/api/auth/[...all]/route.ts`. Calling `auth.api.*` from inside
 *    Vitest would bypass the route handler, the CSRF/origin middleware and
 *    cookie serialisation, which is exactly where several of the behaviours
 *    under test live (session cookies, sign-out cookie clearing).
 *  - So this module boots the real Next.js app in-process (the documented
 *    programmatic API: `next({ dev: true })` → `prepare()` →
 *    `getRequestHandler()`) on an ephemeral port and drives it with `fetch`.
 *  - Database access uses the raw `pg` Pool rather than the app's Prisma
 *    singleton. Better Auth writes to `user`/`session`/`account`/`verification`
 *    through its own adapter, so the fixtures and the assertions must observe
 *    the same rows from the outside; a raw pool keeps that observation
 *    unambiguous and avoids loading a second Prisma client inside the test
 *    worker.
 *
 * Nothing here is a mock of the authentication system. `node:http` and
 * `node:crypto` are the only things stubbed, and both are substituted with
 * real implementations.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { Pool, type PoolClient } from "pg";
import { expect } from "vitest";

/** True when the dev database is configured for the test environment. */
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/** Tables the auth tier writes to, child-first so `TRUNCATE` never deadlocks. */
const AUTH_TABLES = ["session", "account", "verification", "user"] as const;

/**
 * Test-run marker baked into every email/phone this module generates.
 *
 * Assertions and the safety net both key off it, so a row that came from a
 * seeded dev database can never be mistaken for — or deleted as — a fixture.
 */
const RUN_MARKER = `authtest${Date.now().toString(36)}`;

/**
 * Wall-clock instant this helper module loaded (i.e. the start of the run).
 *
 * The cleanup sweep only ever considers rows created at or after this point,
 * so a fixture whose number happens to fall inside the run's numeric window
 * can never be confused with a pre-existing row from an earlier session.
 */
const RUN_STARTED_AT = new Date();

const pool = hasDatabaseUrl
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

/** Postgres `23505` — unique constraint violation. */
export const UNIQUE_VIOLATION = "23505";

/* -------------------------------------------------------------------------- */
/* Server lifecycle                                                           */
/* -------------------------------------------------------------------------- */

type NextApp = {
  prepare: () => Promise<void>;
  getRequestHandler: () => (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
  close: () => Promise<void>;
};

type AuthServer = {
  /** Origin the test suite should target, e.g. `http://127.0.0.1:52311`. */
  origin: string;
  /** URL for a path below the Better Auth catch-all, e.g. `/sign-in/email`. */
  url: (path: string, query?: Record<string, string>) => string;
  close: () => Promise<void>;
};

let server: AuthServer | null = null;

/**
 * Resolves once the in-flight server teardown has finished releasing Next's
 * dev lockfile.
 *
 * Next 16's dev server takes an exclusive lock at `<distDir>/lock` and, if it
 * cannot acquire it within `MAX_RETRY_MS` (1000ms), calls `process.exit(1)`
 * (`next/dist/build/lockfile.js#acquireWithRetriesOrExit`). The lock is
 * released when the hot-reloader closes, which `app.close()` triggers, but the
 * native unlock is not instantaneous. Because Vitest runs every test FILE in
 * the same forked worker (and `fileParallelism: false` serialises them), file
 * N+1 would otherwise boot inside that window and kill the worker.
 *
 * `stopAuthServer` awaits `app.close()`, then this barrier holds for a short
 * settle period before the next `startAuthServer` is allowed to acquire the
 * lock — turning a flaky `process.exit(1)` into a deterministic wait.
 */
let serverTeardown: Promise<void> = Promise.resolve();

/**
 * Boots the Next.js app once per test *file* and returns its origin.
 *
 * `next({ dev: true })` compiles routes on demand, so the very first request
 * after `prepare()` can take tens of seconds. The raw `http.Server` below is
 * deliberately created AFTER `prepare()` so a request can never race the
 * handler; callers only ever see a ready server.
 *
 * **Origin alignment is load-bearing.** better-auth validates the `Origin`
 * header against `trustedOrigins`, which is derived from `BETTER_AUTH_URL`
 * (see lib/auth/auth.ts). If this harness listened on a random port or on
 * `127.0.0.1`, every mutating call would fail with 403 INVALID_ORIGIN while
 * leaving the configured origin untouched — so the server binds to the
 * configured URL's *host* (normally `localhost`) rather than picking an
 * arbitrary loopback alias. The port is resolved by `resolveAuthOrigin`
 * below.
 */
export async function startAuthServer(): Promise<AuthServer> {
  if (server) return server;

  // Wait until any previously-started server in this worker has fully released
  // Next's dev lock (see the note on `serverTeardown` below). Without this,
  // the second test FILE in the same forked worker boots while the first
  // file's lock is still held, and Next's `Lockfile.acquireWithRetriesOrExit`
  // gives up after MAX_RETRY_MS (1s) and calls `process.exit(1)` — which kills
  // the whole worker and reports every remaining test as skipped.
  await serverTeardown;

  const { origin, port } = resolveAuthOrigin();

  // Defence-in-depth against contacting the real SMS gateway. The primary
  // guard is tests/helpers/auth-sms-guard.ts (a `setupFiles` hook for the
  // `auth` project) because Next re-loads `.env` during `prepare()` and would
  // otherwise restore SMSIR_API_KEY. Removing it here still helps for any code
  // path that reads the variable before `prepare()` finishes, and documents
  // the intent at the point the server is created.
  delete process.env.SMSIR_API_KEY;

  // Loaded lazily: importing `next` pulls in a large amount of server code and
  // must not happen in the `unit` tier when this file is transitively imported.
  const { default: next } = await import("next");

  const app = next({
    dev: true,
    dir: process.cwd(),
    hostname: new URL(origin).hostname,
    port,
  }) as unknown as NextApp;

  await app.prepare();
  const handler = app.getRequestHandler();

  const httpServer = http.createServer((req, res) => {
    void handler(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    // Bind explicitly on 127.0.0.1 even when the trusted origin says
    // `localhost`: both resolve to the same loopback interface, and binding to
    // the literal address avoids the IPv6/IPv4 `localhost` ambiguity.
    httpServer.listen(port, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  server = {
    origin,
    url: (path, query) => {
      const url = new URL(`/api/auth${path}`, origin);
      for (const [key, value] of Object.entries(query ?? {})) {
        url.searchParams.set(key, value);
      }
      return url.toString();
    },
    close: async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      await app.close();
      server = null;
      // Hold the barrier briefly so the native dev-lockfile unlock (triggered
      // by the hot-reloader closing) lands before the next file boots. See the
      // note on `serverTeardown`.
      serverTeardown = new Promise<void>((resolve) => setTimeout(resolve, 1500));
    },
  };

  return server;
}

/**
 * The origin the auth server must be reached on, and the port it must listen
 * on, derived from `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — the same
 * values lib/auth/auth.ts feeds into `better-auth`'s `baseURL`, which is what
 * seeds `trustedOrigins`.
 *
 * A mismatched origin would make every POST fail with 403 INVALID_ORIGIN, so
 * this fails fast with a precise message instead of letting the suite report a
 * wall of confusing 403s.
 */
function resolveAuthOrigin(): { origin: string; port: number } {
  const raw = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    throw new Error(
      "The `auth` test tier needs BETTER_AUTH_URL (or NEXT_PUBLIC_APP_URL) to " +
        "match the origin it drives. Neither is set in the test environment.",
    );
  }

  const normalised = raw.includes("://") ? raw : `https://${raw}`;
  const url = new URL(normalised);
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;

  return { origin: url.origin, port };
}

/** Tears the HTTP server down. Call from `afterAll`. */
export async function stopAuthServer(): Promise<void> {
  await server?.close();
  // The barrier set inside `close()` must be awaited here too, so a caller that
  // immediately re-starts (or the next test file) cannot race the lock release.
  await serverTeardown;
}

/* -------------------------------------------------------------------------- */
/* Cookie jar                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Minimal cookie jar.
 *
 * `fetch` does not persist cookies, and Better Auth's session lives in a
 * signed cookie, so every test needs one. Set-Cookie values are parsed with a
 * deliberately narrow reader (first `name=value` pair, split on the first `=`),
 * which is all Better Auth emits — using a full cookie parser here would add a
 * dependency without changing any assertion.
 */
export class CookieJar {
  private readonly store = new Map<string, string>();
  /**
   * Set when the server issues a clearing cookie (an empty value with
   * `Max-Age=0`), which is how sign-out revokes the session client-side. Kept
   * separately from the value map so "cookie was dropped" is observable.
   */
  private readonly cleared = new Set<string>();

  /** `Cookie:` header value for the next request, or undefined when empty. */
  header(): string | undefined {
    if (this.store.size === 0) return undefined;
    return [...this.store].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  /** Folds every `Set-Cookie` of a response into the jar. */
  absorb(response: Response): void {
    for (const raw of getSetCookies(response)) {
      const [pair] = raw.split(";");
      const separator = pair.indexOf("=");
      if (separator < 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value === "") {
        this.store.delete(name);
        this.cleared.add(name);
        continue;
      }
      this.store.set(name, value);
      this.cleared.delete(name);
    }
  }

  get(name: string): string | undefined {
    return this.store.get(name);
  }

  /** True when the server explicitly expired this cookie at some point. */
  wasCleared(name: string): boolean {
    return this.cleared.has(name);
  }

  /** Names currently held, useful for "no session cookie at all" assertions. */
  names(): string[] {
    return [...this.store.keys()];
  }

  clear(): void {
    this.store.clear();
    this.cleared.clear();
  }
}

/**
 * Reads `Set-Cookie` off a response.
 *
 * `Response.headers.getSetCookie()` is the standard accessor, but this
 * environment's `undici` build does not always expose it, so fall back to the
 * comma-joined header. Split on `,` only where it precedes a cookie name —
 * `Expires=` values contain commas, and the split below re-joins those.
 */
function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const joined = response.headers.get("set-cookie");
  if (!joined) return [];
  return joined.split(/,(?=[^;,]+=)/g).map((part) => part.trim());
}

/* -------------------------------------------------------------------------- */
/* HTTP driver                                                                */
/* -------------------------------------------------------------------------- */

/** A response plus its JSON body, parsed lazily and safely. */
export type AuthResponse<T = unknown> = {
  status: number;
  ok: boolean;
  body: T;
  /** Raw `{ code, message }` error payload Better Auth returns on failures. */
  error: { code?: string; message?: string } | null;
  headers: Headers;
};

/**
 * Calls a Better Auth endpoint and returns a parsed response.
 *
 * `jar` may be omitted for stateless calls (registration, sign-in with no
 * prior cookie). `json` sends `application/json`; omitting it sends an empty
 * body, which is what the GET session helpers expect.
 *
 * `ip` sets `x-forwarded-for`, which better-auth uses as the rate-limit
 * bucket key. The phone-number plugin allows only 10 requests / 60s per
 * `(ip|path)` pair, so OTP tests pass a distinct address per test — otherwise
 * a suite that legitimately issues many OTP calls would trip TOO_MANY_ATTEMPTS
 * from rate limiting rather than from the behaviour under test.
 */
export async function authRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST";
    json?: unknown;
    jar?: CookieJar;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    /** Client IP for rate-limit bucketing (`x-forwarded-for`). */
    ip?: string;
  } = {},
): Promise<AuthResponse<T>> {
  const active = await startAuthServer();
  const method = options.method ?? (options.json === undefined ? "GET" : "POST");

  const headers = new Headers({ origin: active.origin, ...options.headers });
  if (options.ip) headers.set("x-forwarded-for", options.ip);
  const cookie = options.jar?.header();
  if (cookie) headers.set("cookie", cookie);
  if (options.json !== undefined) headers.set("content-type", "application/json");

  const response = await fetch(active.url(path, options.query), {
    method,
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
    redirect: "manual",
  });

  options.jar?.absorb(response);

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  const error =
    body && typeof body === "object" && "code" in (body as object) && body !== null
      ? (body as { code?: string; message?: string })
      : null;

  return {
    status: response.status,
    ok: response.ok,
    body: body as T,
    error,
    headers: response.headers,
  };
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

export type TestUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: "user" | "admin" | "owner";
  banned?: boolean;
  banReason?: string;
  /**
   * The session Better Auth created as a side effect of registration
   * (`/sign-up/email` sets a session cookie). Present unless overridden.
   */
  signUpSession?: { jar: CookieJar };
};

/** A unique, run-tagged email address. */
export function uniqueEmail(): string {
  return `${RUN_MARKER}-${randomUUID()}@example.test`;
}

/** A unique, run-tagged Iranian mobile number (`09xxxxxxxxx`). */
export function uniquePhone(): string {
  const suffix = String(Math.floor(10000000 + Math.random() * 89999999));
  return `09${suffix.slice(0, 9)}`;
}

/* -------------------------------------------------------------------------- */
/* Phone / OTP fixtures                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A unique E.164 Iranian mobile (`+989xxxxxxxxx`).
 *
 * The phone-number plugin stores whatever string it is handed as the
 * `identifier` on the `verification` row and as `user.phoneNumber`, so every
 * fixture uses the same format consistently. `+98` (not `+980`) is the correct
 * country code; the trunk `0` is dropped.
 *
 * The 8 trailing digits are derived from the run marker plus a counter, so
 * `sweepRunRows` can recognise — and only ever remove — numbers this run
 * minted. See `PHONE_RUN_PREFIX`.
 */
let phoneCounter = 0;
export function uniquePhoneE164(): string {
  phoneCounter += 1;
  // 9 digits of subscriber number, deterministically stamped with the run id.
  const run = phoneRunSeed();
  const tail = String((run + phoneCounter) % 1000000000).padStart(9, "0");
  return `+989${tail}`;
}

/**
 * Numeric seed shared by this run's phone numbers. Derived from the same
 * `RUN_MARKER` timestamp, so every number the run creates shares a prefix that
 * a later sweep can match without touching seeded rows.
 */
function phoneRunSeed(): number {
  // RUN_MARKER is `authtest<base36>`; reparse the timestamp deterministically.
  const base36 = RUN_MARKER.slice("authtest".length);
  return parseInt(base36, 36) % 100_000_000;
}

/**
 * True when `phoneNumber` looks like one this run generated.
 *
 * The sweep uses this to decide which phone-created accounts are safe to
 * delete. It is intentionally narrow: seeded/dev numbers never match the
 * run's derived prefix.
 */
function isRunPhone(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  const tail = digits.slice(-9);
  const run = String(phoneRunSeed() % 1000000000).padStart(9, "0");
  const distance = Number(tail) - Number(run);
  // Numbers this run created fall within a small window above the seed.
  return distance >= 1 && distance <= 200;
}

/**
 * A per-test client IP, so each OTP test gets its own rate-limit bucket.
 *
 * better-auth keys its limiter on `(ip|path)` and the phone-number plugin caps
 * that at 10 requests / 60s. Distinct addresses keep the suite deterministic
 * without disabling rate limiting (which would hide real behaviour).
 */
let ipCounter = 0;
export function uniqueTestIp(): string {
  ipCounter += 1;
  // TEST-NET-3 (203.0.113.0/24) is reserved for documentation/testing.
  return `203.0.113.${(ipCounter % 250) + 1}`;
}

/**
 * Reads the live OTP code for a phone number straight from the `verification`
 * table.
 *
 * better-auth stores it as `value = "<code>:<attempts>"` (see
 * verifyPhoneNumberOTP in the phone-number plugin). Reading the stored value is
 * the only way to drive a real `/phone-number/verify` call, and it is
 * deliberately *not* a production-code change: the code under test is exactly
 * the one the adapter persisted. Throws when no live row exists so a broken
 * send-otp shows up at its call site.
 */
export async function readOtp(phoneNumber: string): Promise<string> {
  const rows = await query<{ value: string; "expiresAt": Date }>(
    `SELECT value, "expiresAt" FROM verification WHERE identifier = $1`,
    [phoneNumber],
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`No live OTP row for ${phoneNumber} — send-otp must run first.`);
  }
  const [code] = row.value.split(":");
  return code;
}

/**
 * Overwrites a stored OTP's expiry so the "expired OTP" path is exercised
 * without sleeping five minutes.
 *
 * The new value is derived from the row's own `createdAt` (not `now()`): both
 * are `timestamp` columns written by the same code path, so setting
 * `expiresAt = createdAt` guarantees a time in the past without depending on
 * the database session's time zone. The plugin deletes an expired row and
 * reports OTP_EXPIRED on the next verify (routes.mjs:473-475).
 */
export async function expireStoredOtp(phoneNumber: string): Promise<void> {
  const client = await requirePool().connect();
  try {
    await client.query(
      `UPDATE verification
          SET "expiresAt" = "createdAt" - interval '1 second',
              "updatedAt" = "createdAt"
        WHERE identifier = $1`,
      [phoneNumber],
    );
  } finally {
    client.release();
  }
}

/** Deletes any `verification` rows for a phone number. */
export async function deleteOtp(phoneNumber: string): Promise<void> {
  const client = await requirePool().connect();
  try {
    await client.query(`DELETE FROM verification WHERE identifier = $1`, [phoneNumber]);
  } finally {
    client.release();
  }
}

/**
 * Rows in `verification` for a phone number, newest first.
 *
 * `expiresAt` and `createdAt` are both Postgres `timestamp` (no time zone)
 * columns, and this process's driver parses them in the local zone. That is
 * fine as long as assertions compare the two columns to EACH OTHER — they were
 * written by the same code path and share the same representation, so their
 * difference is exact — rather than to `Date.now()`, which is an absolute
 * instant in a different representation. See `otpTtlSeconds`.
 */
export async function findOtpRows(phoneNumber: string): Promise<
  { id: string; value: string; expiresAt: Date; createdAt: Date }[]
> {
  return query<{ id: string; value: string; expiresAt: Date; createdAt: Date }>(
    `SELECT id, value, "expiresAt", "createdAt" FROM verification WHERE identifier = $1 ORDER BY "createdAt" DESC`,
    [phoneNumber],
  );
}

/**
 * The OTP lifetime the row encodes, in seconds, derived from the difference
 * between the two stored `timestamp` columns.
 *
 * Timezone-proof: both columns come back through the same parser, so the
 * subtraction yields the true span the plugin wrote (`expiresIn: 300`) no
 * matter what zone the test process or the database session is in.
 */
export function otpTtlSeconds(row: { expiresAt: Date; createdAt: Date }): number {
  return Math.round((row.expiresAt.getTime() - row.createdAt.getTime()) / 1000);
}

/**
 * Requests an OTP for a phone number through the real send-otp endpoint and
 * returns the code the server stored.
 *
 * This is the phone-side equivalent of `registerUser`: it drives the genuine
 * HTTP surface (and therefore the plugin's generate/store path) and then reads
 * the persisted code so the caller can verify it for real.
 */
export async function requestOtp(
  phoneNumber: string,
  options: { ip?: string } = {},
): Promise<string> {
  const response = await authRequest("/phone-number/send-otp", {
    json: { phoneNumber },
    ip: options.ip ?? uniqueTestIp(),
  });

  expect(
    response.status,
    `phone-number/send-otp failed for ${phoneNumber}: ${response.status} ${JSON.stringify(response.body)}`,
  ).toBe(200);

  return readOtp(phoneNumber);
}

/**
 * Claims a phone number for this run by registering it through a full
 * send-OTP → verify cycle, and returns the created user's id plus the phone.
 *
 * The phone-number plugin creates the account on first successful verification
 * (`signUpOnVerification`), so this yields a real, session-capable user without
 * touching the email/password path.
 */
export async function registerViaPhone(
  overrides: { phoneNumber?: string; ip?: string } = {},
): Promise<{ id: string; phoneNumber: string; tempEmail: string }> {
  const phoneNumber = overrides.phoneNumber ?? uniquePhoneE164();
  const code = await requestOtp(phoneNumber, { ip: overrides.ip });

  const response = await authRequest<{ user?: { id?: string } }>(
    "/phone-number/verify",
    {
      json: { phoneNumber, code, disableSession: true },
      ip: overrides.ip ?? uniqueTestIp(),
    },
  );

  expect(
    response.status,
    `phone-number/verify failed for ${phoneNumber}: ${response.status} ${JSON.stringify(response.body)}`,
  ).toBe(200);

  const id = response.body?.user?.id;
  expect(id, "phone-number/verify must return the created user id").toBeTruthy();

  return {
    id: id as string,
    phoneNumber,
    tempEmail: `${phoneNumber}@phone.ako-light.local`,
  };
}

/**
 * Registers a user through the real sign-up endpoint and returns the fixture.
 *
 * Fails loudly (with the endpoint's own error code) rather than returning a
 * half-built fixture, so a broken registration surfaces at its call site
 * instead of as a confusing downstream assertion.
 */
export async function registerUser(
  overrides: Partial<TestUser> = {},
): Promise<TestUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? "correct-horse-battery-staple";
  const name = overrides.name ?? "Auth Test User";

  // Keep the sign-up cookie jar: Better Auth establishes a session on
  // registration too, so the caller needs to know a session already exists.
  const signUpJar = new CookieJar();
  const response = await authRequest<{ user?: { id?: string } }>("/sign-up/email", {
    json: { email, password, name },
    jar: signUpJar,
  });

  expect(
    response.status,
    `sign-up/email failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`,
  ).toBe(200);

  const id = response.body?.user?.id;
  expect(id, "sign-up/email must return the created user id").toBeTruthy();

  return {
    id: id as string,
    email,
    password,
    name,
    phone: overrides.phone ?? uniquePhone(),
    // Registration itself signs the user in — Better Auth returns a session
    // cookie, so one `session` row exists before any explicit sign-in. Tests
    // that count sessions must account for this baseline session.
    signUpSession: { jar: signUpJar },
    ...overrides,
  };
}

/**
 * Forces the columns Better Auth's own endpoints cannot set on a normal
 * registration (`role`, `banned`, `banReason`, `banExpires`).
 *
 * These are written straight to the database on purpose: they are the state an
 * operator produces through the admin panel, and the point of the role/ban
 * tests is to prove the *reading* side enforces them — not to re-test
 * `admin.setRole`.
 *
 * Also used with `role: "user"` in `it()`. Note `banned` uses `COALESCE`, so
 * passing `false` is meaningful (it will NOT unset an existing ban unless you
 * pass `false` explicitly — which COALESCE treats as a value, so it does set
 * `banned = false`).
 */
export async function setUserFlags(
  userId: string,
  flags: {
    role?: "user" | "admin" | "owner";
    banned?: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean;
  },
): Promise<void> {
  const client = await requirePool().connect();
  try {
    await client.query(
      `UPDATE "user"
          SET role = COALESCE($2, role),
              banned = COALESCE($3, banned),
              "banReason" = CASE WHEN $4::boolean THEN $5 ELSE "banReason" END,
              "banExpires" = CASE WHEN $6::boolean THEN $7 ELSE "banExpires" END,
              "phoneNumber" = CASE WHEN $8::boolean THEN $9 ELSE "phoneNumber" END,
              "phoneNumberVerified" = CASE WHEN $10::boolean THEN $11 ELSE "phoneNumberVerified" END,
              "updatedAt" = now()
        WHERE id = $1`,
      [
        userId,
        flags.role ?? null,
        flags.banned ?? null,
        Object.prototype.hasOwnProperty.call(flags, "banReason"),
        flags.banReason ?? null,
        Object.prototype.hasOwnProperty.call(flags, "banExpires"),
        flags.banExpires ?? null,
        Object.prototype.hasOwnProperty.call(flags, "phoneNumber"),
        flags.phoneNumber ?? null,
        Object.prototype.hasOwnProperty.call(flags, "phoneNumberVerified"),
        flags.phoneNumberVerified ?? false,
      ],
    );
  } finally {
    client.release();
  }
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Signs a registered user in over HTTP and returns the live session.
 *
 * Used by the role/ban tests, which need a session whose subject has a real
 * `role` / `banned` column value. The sign-in goes through the genuine
 * endpoint so the returned cookie is a real signed session token — the same
 * artifact a browser would hold.
 */
export async function signInAs(
  email: string,
  password: string,
  options: { ip?: string } = {},
): Promise<{ jar: CookieJar; token: string; userId: string; response: AuthResponse }> {
  const jar = new CookieJar();
  const response = await authRequest<{ token?: string; user?: { id?: string } }>(
    "/sign-in/email",
    { json: { email, password }, jar, ip: options.ip },
  );

  expect(
    response.status,
    `sign-in/email failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`,
  ).toBe(200);

  const token = response.body?.token;
  expect(token, "sign-in must return a session token").toBeTruthy();

  return {
    jar,
    token: token as string,
    userId: response.body?.user?.id as string,
    response,
  };
}

/**
 * Signs a user in, optionally forcing their `role`/`banned` state first.
 *
 * The role/ban columns cannot be set through sign-up, so this registers the
 * account, writes the flags directly, and only then signs in — which is the
 * order a real operator flow produces too (account exists, staff changes its
 * role, user signs in).
 */
export async function signInWithFlags(
  flags: {
    role?: "user" | "admin" | "owner";
    banned?: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  } = {},
  options: { ip?: string } = {},
): Promise<TestUser & { jar: CookieJar; token: string }> {
  const user = await registerUser();
  if (Object.keys(flags).length > 0) {
    await setUserFlags(user.id, flags);
  }
  const session = await signInAs(user.email, user.password, options);
  return { ...user, jar: session.jar, token: session.token };
}

/**
 * Mints a session for a user by signing in, then applies `flags` afterwards.
 *
 * This reproduces the real sequence for the two "already-signed-in" cases the
 * plan calls for:
 *   - a session that exists BEFORE a ban (so "existing banned-user session" is
 *     exercised against a genuinely-minted, correctly-signed cookie);
 *   - a role change applied to a live session.
 *
 * Forging a session cookie is deliberately avoided: better-auth HMAC-signs the
 * session token with `BETTER_AUTH_SECRET` (`ctx.getSignedCookie`), so a
 * hand-built cookie would not verify and the test would prove nothing.
 */
export async function signedInThenFlagged(
  flags: {
    role?: "user" | "admin" | "owner";
    banned?: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  } = {},
  options: { ip?: string } = {},
): Promise<TestUser & { jar: CookieJar; token: string }> {
  const user = await registerUser();
  const session = await signInAs(user.email, user.password, options);
  if (Object.keys(flags).length > 0) {
    await setUserFlags(user.id, flags);
  }
  return { ...user, jar: session.jar, token: session.token };
}

/* -------------------------------------------------------------------------- */
/* Direct database access                                                     */
/* -------------------------------------------------------------------------- */

function requirePool(): Pool {
  if (!pool) {
    throw new Error(
      "DATABASE_URL is not set — this helper is only usable in DB-backed tiers.",
    );
  }
  return pool;
}

/** Runs a query on a dedicated connection and returns the rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const client = await requirePool().connect();
  try {
    const result = await client.query(text, params as unknown[]);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/** Runs `run` inside a transaction that is always rolled back. */
export async function withRollback<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    return await run(client);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  banned: boolean;
  "banReason": string | null;
  "banExpires": Date | null;
  "phoneNumber": string | null;
  "phoneNumberVerified": boolean;
  "referredByCode": string | null;
};

/** Reads a user row by id, or null when it does not exist. */
export async function findUser(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(`SELECT * FROM "user" WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Reads a user row by email, or null when it does not exist. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(`SELECT * FROM "user" WHERE email = $1`, [email]);
  return rows[0] ?? null;
}

/** Session rows for a user, newest first. */
export async function findSessions(userId: string): Promise<{ id: string; token: string; expiresAt: Date }[]> {
  return query<{ id: string; token: string; expiresAt: Date }>(
    `SELECT id, token, "expiresAt" FROM "session" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [userId],
  );
}

/** Rows Better Auth keeps for phone OTPs (used by later auth steps). */
export async function findVerifications(identifier: string) {
  return query<{ id: string; identifier: string; value: string; expiresAt: Date }>(
    `SELECT id, identifier, value, "expiresAt" FROM verification WHERE identifier = $1`,
    [identifier],
  );
}

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Deletes every row this run created.
 *
 * Scoped to `RUN_MARKER`-tagged emails/phones wherever the schema allows it,
 * and to the fixture ids collected by the caller. The one case that cannot be
 * tag-scoped is `verification`, whose `identifier` is a bare phone number —
 * those are removed by the phone numbers the caller generated.
 */
export async function cleanupFixture(
  options: {
    userIds?: readonly string[];
    emails?: readonly string[];
    identifiers?: readonly string[];
    phoneNumbers?: readonly string[];
  } = {},
): Promise<void> {
  if (!pool) return;
  const userIds = [...(options.userIds ?? [])];
  const emails = [...(options.emails ?? [])];
  const identifiers = [...(options.identifiers ?? [])];
  const phoneNumbers = [...(options.phoneNumbers ?? [])];

  if (
    userIds.length === 0 &&
    emails.length === 0 &&
    identifiers.length === 0 &&
    phoneNumbers.length === 0
  ) {
    return;
  }

  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    // `verification` rows are keyed by the raw phone number (or by
    // `<phone>-request-password-reset`), never by a tag-scoped email, so both
    // the called-out identifiers and the fixture phone numbers are swept here.
    const verificationIds = [...new Set([...identifiers, ...phoneNumbers])];
    if (verificationIds.length) {
      await client.query(`DELETE FROM verification WHERE identifier = ANY($1::text[])`, [
        verificationIds,
      ]);
    }
    // Resolve any user rows the caller only tracked by address or phone.
    const resolved = await client.query<{ id: string }>(
      `SELECT id FROM "user"
        WHERE email = ANY($1::text[])
           OR "phoneNumber" = ANY($2::text[])`,
      [emails, phoneNumbers],
    );
    const ids = [...new Set([...userIds, ...resolved.rows.map((row) => row.id)])];
    if (ids.length) {
      await client.query(`DELETE FROM session WHERE "userId" = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM account WHERE "userId" = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM "user" WHERE id = ANY($1::text[])`, [ids]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Marks the fixture's transaction rolled back and closes the pool. Call once
 * from `afterAll`, after `stopAuthServer()`.
 */
export async function closeDb(): Promise<void> {
  await pool?.end();
}

/**
 * Last-resort sweep: removes every tagged row the run left behind, even when a
 * test aborted before its own cleanup ran.
 *
 * Two independent guards keep this from ever touching pre-existing data:
 *   1. rows must be `RUN_MARKER`-tagged (email/password fixtures) or carry a
 *      phone number inside this run's derived window (phone fixtures);
 *   2. rows must have been created at or after `RUN_STARTED_AT`, so a leftover
 *      from an earlier session can never match even if its number collides.
 */
export async function sweepRunRows(): Promise<void> {
  if (!pool) return;
  const client = await requirePool().connect();
  try {
    // Two sources of run-owned rows:
    //   1. email/password fixtures — email is `RUN_MARKER`-tagged;
    //   2. phone fixtures — the plugin assigns a temp email
    //      (`<phone>@phone.ako-light.local`) that is NOT marker-tagged, so
    //      those are recognised by the number pattern instead.
    //
    // The `createdAt >= $3` clause is the safety net that makes this immune to
    // number collisions with rows left by earlier runs. `createdAt` is a
    // `timestamp` column and Prisma writes it (and this driver reads it) in the
    // local zone, so the bound is built with the same local-zone formatting.
    const cutoff = formatLocalTimestamp(RUN_STARTED_AT);
    const users = await client.query<{
      id: string;
      "phoneNumber": string | null;
      email: string;
    }>(
      `SELECT id, "phoneNumber", email FROM "user"
        WHERE "createdAt" >= $3
          AND (email LIKE $1 OR email LIKE $2)`,
      [`${RUN_MARKER}%`, "%@phone.ako-light.local", cutoff],
    );

    const owned = users.rows.filter(
      (row) =>
        row.email.startsWith(RUN_MARKER) ||
        (row["phoneNumber"] ? isRunPhone(row["phoneNumber"]) : false),
    );

    const ids = owned.map((row) => row.id);
    const phones = owned
      .map((row) => row["phoneNumber"])
      .filter((value): value is string => Boolean(value));

    await client.query("BEGIN");
    if (phones.length) {
      await client.query(`DELETE FROM verification WHERE identifier = ANY($1::text[])`, [phones]);
    }
    if (ids.length) {
      await client.query(`DELETE FROM session WHERE "userId" = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM account WHERE "userId" = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM "user" WHERE id = ANY($1::text[])`, [ids]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Formats a `Date` as a `YYYY-MM-DD HH:MM:SS.mmm` string in the process's
 * local zone — the representation Postgres uses for a `timestamp` (no time
 * zone) column, and the one Prisma writes when it serialises a JS `Date`.
 *
 * Building the cutoff this way keeps a `createdAt >= $n` comparison in the same
 * representation as the stored values, regardless of the process or database
 * session time zone.
 */
function formatLocalTimestamp(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
    `${pad(date.getMilliseconds(), 3)}`
  );
}

/** Exposed for tests that need to assert the truncate target list is complete. */
export const AUTH_TIER_TABLES = AUTH_TABLES;
