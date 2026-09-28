/**
 * Auth-tier network guard (Vitest `setupFiles` for the `auth` project).
 *
 * The `auth` tier boots the real Next app in-process and drives it over HTTP,
 * so `lib/auth/sms.ts` runs for real. Its sandbox/dev branches still issue a
 * genuine `fetch` to `https://api.sms.ir/v1/send/verify` whenever
 * SMSIR_API_KEY is present — and Next re-loads `.env` during `prepare()`, so
 * deleting the variable from the parent process is not enough (it comes back).
 *
 * Pass 11.5A is explicit that the SMS provider must be mocked and no real SMS
 * may be sent, so this file installs a hard guard in front of the global
 * `fetch`:
 *
 *   - any request to an `sms.ir` host is intercepted and answered locally with
 *     the shape sms.ir's Verify API returns on success (`{ status: 1 }`);
 *   - the request never leaves the machine;
 *   - every other URL falls through to the real `fetch` untouched.
 *
 * Because the Next server shares this process's `globalThis`, the interception
 * covers the app's own outbound call. Nothing about better-auth or the OTP
 * logic is stubbed — only the external gateway is.
 */
import { afterAll, beforeAll, vi } from "vitest";

/** Hosts treated as the SMS gateway and blocked from real egress. */
const SMS_HOSTS = ["api.sms.ir", "sms.ir"];

/** Codes "delivered" through the intercepted gateway, for assertions if needed. */
export const deliveredSms: { phoneNumber: string; code: string }[] = [];

const realFetch = globalThis.fetch;

function isSmsUrl(input: RequestInfo | URL): boolean {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    const { hostname } = new URL(url);
    return SMS_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/** Extracts the OTP code sms.ir's payload carries in `parameters[].value`. */
function extractCode(init?: RequestInit): string | undefined {
  if (!init?.body || typeof init.body !== "string") return undefined;
  try {
    const parsed = JSON.parse(init.body) as {
      mobile?: string;
      parameters?: { name?: string; value?: string }[];
    };
    const codeParam = parsed.parameters?.find((p) => p.name === "Code");
    if (codeParam?.value) {
      deliveredSms.push({ phoneNumber: parsed.mobile ?? "", code: codeParam.value });
      return codeParam.value;
    }
  } catch {
    // body was not JSON — nothing to record.
  }
  return undefined;
}

beforeAll(() => {
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    if (isSmsUrl(input)) {
      extractCode(init);
      // Mirror sms.ir's success envelope; no network egress.
      return Promise.resolve(
        new Response(JSON.stringify({ status: 1, message: "موفق", data: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return realFetch(input, init);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});
