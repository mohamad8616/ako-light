import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The pg pool config, with BOUNDED timeouts.
 *
 * ── Why the bounds exist ────────────────────────────────────────────────────
 *
 * `DATABASE_URL` points at a REMOTE pooler (`siah-kaman.liara.cloud:32337`), and
 * that link stalls intermittently — most visibly when a VPN is up, where a
 * connection is accepted and then simply never answers. With no timeout
 * configured, `pg` waits FOREVER in that case, and the stall propagates all the
 * way up: a Server Action never resolves, the admin's Save button stays
 * disabled showing "Saving…", no toast is ever raised, and the row is silently
 * not written. That is the reported "the saving button will not work" — a
 * database that never replied, wearing the costume of a broken form.
 *
 * These three bounds convert that indefinite hang into a fast, visible failure,
 * so the action returns an `ActionResult` error and the admin is told something
 * went wrong instead of being left staring at a dead button:
 *
 *   - `connectionTimeoutMillis` — bounds the CONNECT phase.
 *   - `query_timeout` — bounds a STALLED SOCKET. This is the one that matters
 *     for the VPN case: the server may have executed the statement already, so
 *     `statement_timeout` alone would never fire while the client waits for a
 *     reply that never arrives.
 *   - `statement_timeout` — bounds SERVER-SIDE execution (a lock wait, a
 *     runaway query).
 *
 * The 30 s values are deliberately ALIGNED WITH THE APP'S EXISTING CEILING:
 * `CHECKOUT_TX_OPTIONS` and the DB tests already use `timeout: 30_000` for
 * Prisma interactive transactions, so nothing that is legitimately allowed to
 * run today is cut short. No pool SIZE is set here — `max` is left to the
 * driver default, because the connection-count pressure seen in this
 * environment is a property of how many dev servers and test tiers run at once,
 * not of any single process's pool.
 */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  statement_timeout: 30_000,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
