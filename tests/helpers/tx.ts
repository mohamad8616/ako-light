/**
 * Transaction options shared by the database-backed tiers (`server` +
 * `integration`).
 *
 * WHY THIS IS A MODULE RATHER THAN A PER-FILE CONSTANT
 *
 * Prisma's default `maxWait` is **2000 ms**. The remote Neon pooler regularly
 * exceeds that on a cold connection, and the failure it produces —
 *
 *   Transaction API error: Unable to start a transaction in the given time.
 *
 * — reads exactly like an application bug while being nothing of the sort. It
 * has cost this project time repeatedly.
 *
 * The previous fix hoisted the options into a per-FILE constant "so the budget
 * cannot drift again". It drifted: 14 files had fallen back to a 20 s budget and
 * **57 `$transaction` calls** were passing inline literals. A per-file constant
 * cannot prevent that, because each new file is free to invent its own.
 *
 * So the budget lives here, once. Every `$transaction` in a DB tier should pass
 * `TX_OPTIONS`; a test that genuinely needs a different budget must say so
 * explicitly and visibly.
 *
 * WHY 30 SECONDS
 *
 * A transaction cannot start until the pooler hands it a connection, and that
 * wait is invisible until it expires — the test simply fails somewhere
 * unrelated-looking. 30 s sits comfortably above the observed worst case while
 * still expiring well before the tier's own timeouts, so a REAL hang is still
 * reported as a test failure rather than being masked.
 *
 * NOTE: this does not make the DB tiers deterministic on its own. They share one
 * remote database and are sensitive to machine load — never run them
 * concurrently with a build. See docs/testing.md.
 */
export const TX_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;
