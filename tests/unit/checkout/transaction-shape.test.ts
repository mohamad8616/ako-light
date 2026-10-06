/**
 * Checkout transaction shape — Pass 8.
 *
 * The checkout transaction used to run on Prisma's DEFAULT budget
 * (`maxWait: 2000`, `timeout: 5000`) and did `2N + 4` round trips for an
 * N-line cart, because `claimProductStock` re-read each product row one at a
 * time even though the caller had just read the same rows. Against the remote
 * pooler (~320 ms RTT) a 4-line cart reached ~4.5 s — 90 % of the 5 s ceiling.
 *
 * These are STATIC SOURCE assertions (no jsdom, no database). They pin the
 * SHAPE of the fix so it cannot silently regress:
 *
 *   - the checkout transaction passes an explicit, generous budget;
 *   - the transaction hands the claim the rows it already read, so the claim
 *     does not re-read them;
 *   - no external network call is made from inside the transaction body.
 *
 * A behavioural equivalent would need a live remote DB and is covered by the
 * `server` tier (tests/server/checkout-action.test.ts, order-stock.test.ts).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, `file://${root}`), "utf8");
}

/** Strips `//` line comments so assertions cannot match explanatory prose. */
function stripLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      return index === -1 ? line : line.slice(0, index);
    })
    .join("\n");
}

/**
 * Extracts the body of the checkout transaction — the arrow function passed to
 * `prisma.$transaction` — so "is there a fetch in the transaction" is asked of
 * the transaction and not of the whole file (which legitimately calls the
 * gateway OUTSIDE it).
 */
function transactionBody(source: string): string {
  const start = source.indexOf("prisma.$transaction(async (tx) => {");
  expect(start, "the checkout transaction must still exist").toBeGreaterThan(-1);
  // Walk braces from the opening `{` of the arrow body to its match.
  const openBrace = source.indexOf("{", start);
  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openBrace, i + 1);
    }
  }
  throw new Error("unterminated transaction body");
}

describe("checkout transaction shape", () => {
  const src = read("lib/actions/checkout.ts");
  const body = transactionBody(stripLineComments(src));

  it("passes an explicit transaction budget (not Prisma's 5s default)", () => {
    expect(src).toContain("CHECKOUT_TX_OPTIONS");
    expect(src).toContain("}, CHECKOUT_TX_OPTIONS)");

    // The default was 5 s; the budget must be materially larger and match the
    // 30 s sibling transactions in the codebase.
    const match = src.match(/CHECKOUT_TX_OPTIONS\s*=\s*\{([^}]*)\}/);
    expect(match, "CHECKOUT_TX_OPTIONS must be a literal object").toBeTruthy();
    expect(match![1]).toContain("maxWait: 30_000");
    expect(match![1]).toContain("timeout: 30_000");
  });

  it("hands the already-read rows to the stock claim (no re-read per line)", () => {
    // The claim must receive the third `known` argument.
    expect(body).toContain("knownProducts");
    expect(body).toMatch(/claimProductStock\([\s\S]*?knownProducts,?\s*\)/);
  });

  it("performs NO external network call inside the transaction", () => {
    // The transaction must be pure database work. External calls (the gateway
    // request, any fetch) happen OUTSIDE it — see the tests below. The check is
    // for CALLS, not the word "zarinpal": the transaction legitimately reads the
    // `zarinpalAuthority` COLUMN for the idempotency replay.
    expect(body).not.toMatch(/\bfetch\s*\(/);
    expect(body).not.toContain("requestZarinpalPayment");
    expect(body).not.toMatch(/await\s+request\s*\(/);
    expect(body).not.toContain("sendOrderReceipt");
    expect(body).not.toContain("StartPay");
  });

  it("requests the gateway only AFTER the transaction has committed", () => {
    const txIndex = src.indexOf("}, CHECKOUT_TX_OPTIONS)");
    const gatewayIndex = src.indexOf("await requestZarinpalPayment");
    expect(txIndex).toBeGreaterThan(-1);
    expect(gatewayIndex).toBeGreaterThan(-1);
    expect(gatewayIndex).toBeGreaterThan(txIndex);
  });

  it("keeps the guarded stock claim (availability enforced in the WHERE clause)", () => {
    // The atomic guarantee lives in the claim, not the action — assert it is
    // still called with the transaction client as the 2nd argument.
    expect(body).toMatch(/claimProductStock\(\s*\[[\s\S]*?\]\.map[\s\S]*?\n\s*tx,/);
  });
});

describe("claimProductStock read de-duplication", () => {
  const stock = read("lib/repositories/orders/stock.ts");

  it("still guards the decrement with the availability rule in the WHERE clause", () => {
    // The decision must remain the guarded UPDATE, never the read.
    expect(stock).toContain("existsInStore: true");
    expect(stock).toContain("quantity: { gte: quantity }");
    expect(stock).toContain("data: { quantity: { decrement: quantity } }");
  });

  it("only reads the row when the caller did not supply it", () => {
    // `known` short-circuits the findUnique; without it, the read still happens
    // (the settlement re-reservation path relies on that).
    expect(stock).toMatch(/known\?\.get\(productId\)/);
    expect(stock).toContain("await tx.product.findUnique({");
  });
});
