/**
 * Next.js instrumentation hook — runs ONCE per server process, before the first
 * request is served (`register()` is awaited during boot, including in dev and
 * in tests that boot the app in-process).
 *
 * Its only job is the environment preflight: a misconfiguration that would
 * otherwise corrupt data at runtime is turned into a loud, immediate boot
 * failure. See lib/env.ts for the rules and the bug that motivated them.
 *
 * The check is skipped under `NODE_ENV=test`, because the `auth` tier boots the
 * real app in-process against faked gateways and would otherwise be gated on
 * production credentials it deliberately does not have. `lib/env.ts` enforces
 * the same skip internally, so both layers agree.
 */
export async function register() {
  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}
