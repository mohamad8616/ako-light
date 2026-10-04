/**
 * Server-only configuration for abandoned checkout reservations.
 *
 * The project has no gateway/session expiry value to inherit. Twenty-four
 * hours is deliberately conservative: it leaves a full day for the customer
 * to return and for a delayed callback to settle before inventory is released.
 * A once-daily Vercel Cron is compatible with Hobby scheduling limits; actual
 * release therefore occurs at the first run after the 24-hour cutoff.
 *
 * `createdAt` is the reservation's birth; `updatedAt` changes when an authority
 * is stored and when status changes, so it does NOT measure reservation age.
 *
 * These variables have no NEXT_PUBLIC_ prefix and are read only by the server.
 */
export const DEFAULT_PENDING_ORDER_EXPIRATION_MINUTES = 24 * 60;
export const DEFAULT_CLEANUP_BATCH_SIZE = 25;

export type StaleOrderConfig = {
  expirationMinutes: number;
  batchSize: number;
};

function positiveInteger(
  raw: string | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw === "") return defaultValue;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

/** Validate at invocation (including tests), never silently fall back on bad input. */
export function readStaleOrderConfig(
  env: Record<string, string | undefined> = process.env,
): StaleOrderConfig {
  return {
    expirationMinutes: positiveInteger(
      env.PENDING_ORDER_EXPIRATION_MINUTES,
      "PENDING_ORDER_EXPIRATION_MINUTES",
      DEFAULT_PENDING_ORDER_EXPIRATION_MINUTES,
      60,
      7 * 24 * 60,
    ),
    batchSize: positiveInteger(
      env.CLEANUP_BATCH_SIZE,
      "CLEANUP_BATCH_SIZE",
      DEFAULT_CLEANUP_BATCH_SIZE,
      1,
      100,
    ),
  };
}

/** Strictly older than this timestamp means stale; equality is NOT stale. */
export function staleOrderCutoff(now: Date, expirationMinutes: number): Date {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid cleanup clock");
  if (!Number.isSafeInteger(expirationMinutes) || expirationMinutes < 1) {
    throw new Error("Invalid pending-order expiration");
  }
  return new Date(now.getTime() - expirationMinutes * 60_000);
}
