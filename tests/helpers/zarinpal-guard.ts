/**
 * Payment-tier network guard (Vitest `setupFiles` for the `auth` project).
 *
 * The `auth` tier boots the real Next app in-process and drives it over HTTP,
 * so the checkout callback route runs for real — including its `verify()` call
 * to ZarinPal. There is no ZarinPal sandbox credential in CI, and a test must
 * never depend on a third party's uptime or actually move money, so this guard
 * answers the two ZarinPal endpoints locally with their documented success
 * envelopes.
 *
 * Scope is deliberately narrow, mirroring tests/helpers/auth-sms-guard.ts:
 *
 *   - only `zarinpal.com` hosts are intercepted;
 *   - every other URL falls through to the real `fetch` untouched;
 *   - nothing about the app's own logic is stubbed — the route, the order
 *     writes, the status transitions and the notification dispatch all run for
 *     real. Only the external gateway is faked.
 *
 * The sandbox host is used because ZARINPAL_MODE defaults to "sandbox".
 */
import { afterAll, beforeAll, vi } from "vitest";

/** Hosts treated as the payment gateway and answered locally. */
const ZARINPAL_HOSTS = ["zarinpal.com", "sandbox.zarinpal.com", "payment.zarinpal.com"];

/** Every intercepted call, for assertions. */
export const zarinpalCalls: { url: string; body: unknown }[] = [];

function isZarinpalUrl(input: RequestInfo | URL): boolean {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    const { hostname } = new URL(url);
    return ZARINPAL_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function readBody(init?: RequestInit): unknown {
  if (!init?.body || typeof init.body !== "string") return undefined;
  try {
    return JSON.parse(init.body);
  } catch {
    return undefined;
  }
}

beforeAll(() => {
  // Captured at INSTALL time so this guard composes with the SMS guard
  // (tests/helpers/auth-sms-guard.ts) rather than replacing it — both are
  // setupFiles, and whichever installs last must still pass through the other.
  const previousFetch = globalThis.fetch;

  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isZarinpalUrl(input)) return previousFetch(input, init);

    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    zarinpalCalls.push({ url, body: readBody(init) });

    // Both endpoints share the same envelope shape; only the payload differs.
    //   request.json → { data: { code: 100, authority } }
    //   verify.json  → { data: { code: 100, ref_id } }
    const isVerify = url.includes("/verify.json");
    const data = isVerify
      ? { code: 100, message: "Verified", ref_id: "TEST-REF-1" }
      : { code: 100, message: "Success", authority: "TEST-AUTHORITY-1" };

    return Promise.resolve(
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});
