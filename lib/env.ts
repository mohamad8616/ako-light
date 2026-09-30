/**
 * Environment preflight — fail LOUDLY at boot for misconfigurations that
 * otherwise corrupt data at runtime.
 *
 * The motivating bug: `ZARINPAL_MERCHANT_ID` was only presence-checked, so a
 * value that was set but WRONG (a truncated paste, the merchant name, a
 * placeholder) sailed through. ZarinPal then rejected every call with `code: 0`
 * and the checkout callback recorded `Order.status = "failed"` — silently
 * marking a real, paid order as failed, for every customer, with no error
 * anywhere. Discovery only happened by reading the database.
 *
 * Two layers of defence, deliberately:
 *
 *   1. `lib/payments/zarinpal.ts` classifies the runtime failure as a GATEWAY
 *      fault, so a bad id can never again be written as a failed payment — the
 *      order stays recoverable and the customer is told the truth.
 *   2. this module rejects the bad value at startup, where it is a one-line fix
 *      instead of a pile of corrupted orders.
 *
 * Design rules:
 *   - Validate SHAPE, not reachability. A boot must never depend on a third
 *     party being up, and it must not make a network call.
 *   - Only require what is genuinely needed in the given environment, so the
 *     existing dev and test setups (which run without real credentials) keep
 *     working. Nothing here throws in `test`, where the guards fake the gateway
 *     and a valid-shaped id is supplied deliberately.
 *   - Never echo a secret value into the error or a log — name the variable only.
 *   - Return the findings as data as well, so a test can assert the rules without
 *     throwing.
 */
import { isMerchantIdShaped } from "@/lib/payments/zarinpal";

export type EnvProblem = {
  /** The variable's name — never its value. */
  name: string;
  /** What is wrong, and what to do about it. */
  message: string;
};

type Env = Record<string, string | undefined>;

/**
 * Collects every configuration problem it can see, without throwing.
 *
 * Exported separately from `assertEnv()` so a unit test can pin the rules
 * (and the "no value is leaked into the message" guarantee) directly.
 */
export function collectEnvProblems(
  env: Env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): EnvProblem[] {
  const problems: EnvProblem[] = [];

  problems.push(...checkZarinpal(env, nodeEnv));
  problems.push(...checkNotificationDelivery(env, nodeEnv));

  return problems;
}

/**
 * ZarinPal is validated in EVERY environment, including development — not only
 * before a deploy. A developer running the real sandbox flow with a malformed
 * merchant id is exactly the scenario that produced the corrupted orders, and
 * it is just as cheap to catch locally as in production.
 *
 * The one exception is `test`: the suite fakes the gateway and supplies a
 * well-formed id, so requiring it there would add nothing.
 */
function checkZarinpal(env: Env, nodeEnv: string | undefined): EnvProblem[] {
  if (nodeEnv === "test") return [];

  const problems: EnvProblem[] = [];
  const merchantId = env.ZARINPAL_MERCHANT_ID;

  if (!merchantId || merchantId.trim().length === 0) {
    problems.push({
      name: "ZARINPAL_MERCHANT_ID",
      message:
        "is not set. Checkout cannot create a payment, and no payment could ever be verified.",
    });
    return problems;
  }

  if (!isMerchantIdShaped(merchantId)) {
    // The value is deliberately not repeated — it may be a real (mistyped)
    // credential, and this message can reach a log or a build output.
    problems.push({
      name: "ZARINPAL_MERCHANT_ID",
      message:
        "is set but is not a ZarinPal UUID (36 chars, 8-4-4-4-12 hex). A malformed id makes ZarinPal reject every call, which would mark genuinely paid orders as failed instead of reporting an error. Check for a truncated paste or a placeholder value.",
    });
  }

  const mode = env.ZARINPAL_MODE;
  if (
    nodeEnv === "production" &&
    mode !== undefined &&
    mode !== "" &&
    mode !== "sandbox" &&
    mode !== "production"
  ) {
    problems.push({
      name: "ZARINPAL_MODE",
      message: `is "${mode}", which is not "sandbox" or "production". It is ignored and the sandbox host is used — a production deployment would silently charge nobody.`,
    });
  }

  return problems;
}

/**
 * In production, a delivery channel must be configured or receipts are dropped.
 *
 * Both `lib/notifications/sms.ts` and `lib/notifications/email.ts` fall back to
 * logging in development. That fallback is correct locally and unacceptable in
 * production, where it means a paying customer never receives a confirmation.
 * Nothing is required below production, so local and CI runs are unaffected.
 */
function checkNotificationDelivery(
  env: Env,
  nodeEnv: string | undefined,
): EnvProblem[] {
  if (nodeEnv !== "production") return [];

  const hasSms = Boolean(env.SMSIR_API_KEY && env.SMSIR_LINE_NUMBER);
  const hasEmail = Boolean(env.SMTP_HOST);

  if (!hasSms && !hasEmail) {
    return [
      {
        name: "SMSIR_API_KEY / SMSIR_LINE_NUMBER / SMTP_HOST",
        message:
          "none is configured, so order receipts after a successful payment will be written to the server log instead of delivered. Configure at least one channel.",
      },
    ];
  }

  return [];
}

/**
 * Throws a single, readable error listing every problem found.
 *
 * Called from `instrumentation.ts`, which Next.js runs once per server boot —
 * including before it serves its first request — so a misconfigured deployment
 * fails immediately and visibly rather than corrupting orders for hours.
 */
export function assertEnv(
  env: Env = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  const problems = collectEnvProblems(env, nodeEnv);
  if (problems.length === 0) return;

  const lines = problems.map((p) => `  - ${p.name} ${p.message}`);
  throw new Error(
    [
      `Invalid environment configuration (${problems.length} problem${problems.length === 1 ? "" : "s"}):`,
      ...lines,
      "",
      "See .env.example for what each variable needs.",
    ].join("\n"),
  );
}
