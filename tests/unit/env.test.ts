/**
 * The environment preflight exists because a misconfigured
 * `ZARINPAL_MERCHANT_ID` used to be discovered by reading the database: it
 * silently marked every genuinely paid order as failed. These tests pin the
 * rules that turn that into a loud boot failure, and — equally important — pin
 * that the check does NOT fire in the environments that legitimately run
 * without real credentials.
 */
import { describe, expect, it } from "vitest";

import { assertEnv, collectEnvProblems } from "@/lib/env";

const VALID_MERCHANT_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

/**
 * A minimal env with everything the preflight requires satisfied, so a test in
 * one describe block never trips a rule owned by another. The notification
 * channel is included deliberately — otherwise the production receipt check
 * fires alongside every merchant-id assertion.
 *
 * The four LIARA_* values are here for the same reason: Liara is the app's only
 * media backend, so `checkLiaraStorage` requires them in PRODUCTION (see
 * lib/env.ts) and would otherwise add four problems to every production-mode
 * assertion in this file.
 */
function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    ZARINPAL_MERCHANT_ID: VALID_MERCHANT_ID,
    ZARINPAL_MODE: "sandbox",
    SMTP_HOST: "smtp.example.com",
    LIARA_ENDPOINT: "https://storage.c2.liara.site",
    LIARA_BUCKET_NAME: "test-bucket",
    LIARA_ACCESS_KEY: "test-access-key",
    LIARA_SECRET_KEY: "test-secret-key",
    ...overrides,
  };
}

describe("env preflight — ZarinPal merchant id", () => {
  it("passes a well-formed merchant id", () => {
    expect(collectEnvProblems(validEnv(), "production")).toEqual([]);
  });

  it("reports a missing merchant id", () => {
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MERCHANT_ID: undefined }),
      "production",
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].name).toBe("ZARINPAL_MERCHANT_ID");
    expect(problems[0].message).toContain("not set");
  });

  it("reports a whitespace-only merchant id", () => {
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MERCHANT_ID: "   " }),
      "production",
    );

    expect(problems[0].name).toBe("ZARINPAL_MERCHANT_ID");
  });

  it("reports a MALFORMED merchant id — the case that used to be silent", () => {
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MERCHANT_ID: "my-merchant-name" }),
      "production",
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("not a ZarinPal UUID");
    // The message must explain the CONSEQUENCE, since that is the whole reason
    // this validation exists.
    expect(problems[0].message).toContain("paid orders as failed");
  });

  it("never includes the merchant id value in the message", () => {
    const secret = "do-not-leak-me";
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MERCHANT_ID: secret }),
      "production",
    );

    expect(problems[0].message).not.toContain(secret);
  });

  it("validates in development too — a dev with a bad id corrupts orders just as fast", () => {
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MERCHANT_ID: "nope" }),
      "development",
    );

    expect(problems).toHaveLength(1);
  });

  it("does not require the merchant id in the test environment", () => {
    // The auth tier boots the real app against a faked gateway and supplies a
    // well-formed id; requiring one here would add nothing and couple the
    // suite to credentials it deliberately does not have.
    expect(
      collectEnvProblems({ ZARINPAL_MERCHANT_ID: undefined }, "test"),
    ).toEqual([]);
  });
});

describe("env preflight — ZARINPAL_MODE", () => {
  it("rejects an unrecognised mode in production", () => {
    // An unrecognised mode silently falls back to the sandbox host, so a
    // production deployment would charge nobody.
    const problems = collectEnvProblems(
      validEnv({ ZARINPAL_MODE: "live" }),
      "production",
    );

    expect(problems.map((p) => p.name)).toContain("ZARINPAL_MODE");
  });

  it("ignores the mode outside production", () => {
    expect(
      collectEnvProblems(validEnv({ ZARINPAL_MODE: "whatever" }), "development"),
    ).toEqual([]);
  });

  it("accepts the documented modes", () => {
    expect(
      collectEnvProblems(validEnv({ ZARINPAL_MODE: "sandbox" }), "production"),
    ).toEqual([]);
    expect(
      collectEnvProblems(validEnv({ ZARINPAL_MODE: "production" }), "production"),
    ).toEqual([]);
  });
});

describe("env preflight — notification delivery", () => {
  /**
   * ZarinPal satisfied, but no receipt channel configured. Built from
   * `validEnv()` so the Liara credentials — required in production — are
   * present, leaving this block to exercise only the notification rule it owns.
   */
  const noChannel = () => validEnv({ SMTP_HOST: undefined });

  it("allows production startup when no receipt channel is configured", () => {
    expect(collectEnvProblems(noChannel(), "production")).toEqual([]);
  });

  it("is satisfied by a complete SMS channel", () => {
    const problems = collectEnvProblems(
      { ...noChannel(), SMSIR_API_KEY: "k", SMSIR_LINE_NUMBER: "3000" },
      "production",
    );

    expect(problems).toEqual([]);
  });

  it("is satisfied by an email channel alone", () => {
    const problems = collectEnvProblems(
      { ...noChannel(), SMTP_HOST: "smtp.example.com" },
      "production",
    );

    expect(problems).toEqual([]);
  });

  it("allows a sandbox API key without a sending line in production", () => {
    expect(
      collectEnvProblems({ ...noChannel(), SMSIR_API_KEY: "sandbox-key" }, "production"),
    ).toEqual([]);
  });

  it("does not require a channel outside production", () => {
    expect(collectEnvProblems(noChannel(), "development")).toEqual([]);
  });
});

describe("assertEnv", () => {
  it("is silent when everything is configured", () => {
    expect(() => assertEnv(validEnv(), "production")).not.toThrow();
  });

  it("throws one readable error listing every problem", () => {
    let message = "";
    try {
      assertEnv({}, "production");
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain("Invalid environment configuration");
    // Unrelated production validation remains enforced.
    expect(message).toContain("ZARINPAL_MERCHANT_ID");
    expect(message).not.toContain("SMTP_HOST");
    // Points the operator at the documentation.
    expect(message).toContain(".env.example");
  });
});
