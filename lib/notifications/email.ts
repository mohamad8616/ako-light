/**
 * Transactional email delivery over SMTP — the project's only email path.
 *
 * Deliberately SMTP (nodemailer) rather than a vendor SDK: nodemailer is free
 * and provider-agnostic, so the same code works against a free Gmail
 * app-password, an Iranian mail host, or a paid relay, and swapping providers
 * is an env change rather than a code change. There is no vendor lock-in and
 * nothing to re-integrate if the current host becomes unreachable.
 *
 * Configuration (see .env.example):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 *
 * When SMTP_HOST is unset the module logs the message instead of sending, so
 * development and CI need no credentials. In production an unconfigured host
 * throws, matching lib/auth/sms.ts — a customer expecting a receipt must never
 * be silently skipped.
 */
import nodemailer, { type Transporter } from "nodemailer";

const SMTP_HOST_ENV = "SMTP_HOST";
const SMTP_PORT_ENV = "SMTP_PORT";
const SMTP_USER_ENV = "SMTP_USER";
const SMTP_PASS_ENV = "SMTP_PASS";
const SMTP_FROM_ENV = "SMTP_FROM";
const SMTP_SECURE_ENV = "SMTP_SECURE";

/** Default submission port. 465 implies implicit TLS; 587 upgrades via STARTTLS. */
const DEFAULT_PORT = 587;

/** True when an SMTP host is configured. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env[SMTP_HOST_ENV]?.trim());
}

/**
 * Builds a transport from the environment.
 *
 * The transport is created per call rather than cached in a module-level
 * singleton: a Next server may be recycled between requests, and a stale
 * pooled connection is a much worse failure mode than the cost of a new
 * connection for a receipt that is sent once per order.
 */
function createTransport(): Transporter {
  const host = process.env[SMTP_HOST_ENV]?.trim();
  if (!host) {
    throw new Error("[notifications/email] SMTP_HOST is not set.");
  }

  const port = Number(process.env[SMTP_PORT_ENV]?.trim() ?? DEFAULT_PORT);
  const user = process.env[SMTP_USER_ENV]?.trim();
  const pass = process.env[SMTP_PASS_ENV]?.trim();

  // `secure` is explicit when set; otherwise inferred from the port, which is
  // what every SMTP provider's docs assume (465 = implicit TLS, 587 = STARTTLS).
  const secure = process.env[SMTP_SECURE_ENV]
    ? process.env[SMTP_SECURE_ENV]?.trim().toLowerCase() === "true"
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    // Anonymous relays exist, so auth is only configured when credentials are
    // actually present — passing an empty auth object breaks some servers.
    auth: user && pass ? { user, pass } : undefined,
  });
}

/**
 * Sends one plain-text email.
 *
 * Throws on a real SMTP failure so the caller can log it; the order-receipt
 * orchestrator deliberately swallows that (a receipt must never break the
 * payment confirmation page).
 */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isEmailConfigured()) {
    if (isProduction) {
      throw new Error(
        "[notifications/email] NODE_ENV=production but SMTP_HOST is not set. " +
          "Configure the SMTP_* variables (see .env.example) before relying on " +
          "email receipts.",
      );
    }
    // Development / CI: show the message the customer would have received.
    console.log(`[DEV EMAIL] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const from =
    process.env[SMTP_FROM_ENV]?.trim() ??
    process.env[SMTP_USER_ENV]?.trim() ??
    "no-reply@localhost";

  const transport = createTransport();
  try {
    await transport.sendMail({ from, to, subject, text });
  } finally {
    // No connection pooling is configured, so this just releases the socket.
    transport.close();
  }
}
