import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildZarinPalBaseUrl,
  isPaymentRequestSuccess,
  isVerificationSuccess,
  request,
  toRial,
  verify,
} from "@/lib/payments/zarinpal";

/**
 * Part D: the amount sent to ZarinPal is the stored Toman amount converted by
 * the fixed x10 unit factor. There is no exchange rate and no EUR conversion —
 * priceEur is display-only and must never reach the gateway.
 */
describe("toRial (fixed Toman -> Rial conversion)", () => {
  it("treats 1 Toman as exactly 10 Rial — a unit fact, not a rate", () => {
    expect(toRial(0)).toBe(0);
    expect(toRial(1)).toBe(10);
    expect(toRial(45_000_000)).toBe(450_000_000);
  });

  it("takes no rate argument: the same Toman amount always yields the same Rial amount", () => {
    expect(toRial(2_500_000)).toBe(25_000_000);
    expect(toRial(2_500_000)).toBe(toRial(2_500_000));
  });
});

describe("zarinpal payment helpers", () => {
  it("uses the sandbox base URL in sandbox mode", () => {
    expect(buildZarinPalBaseUrl("sandbox")).toBe(
      "https://sandbox.zarinpal.com",
    );
  });

  it("recognizes ZarinPal success codes", () => {
    expect(isPaymentRequestSuccess(100)).toBe(true);
    expect(isVerificationSuccess(101)).toBe(true);
    expect(isVerificationSuccess(100)).toBe(true);
    expect(isVerificationSuccess(0)).toBe(false);
  });
});

describe("zarinpal gateway amounts", () => {
  const fetchMock = vi.fn();

  const okResponse = (data: Record<string, unknown>): Response =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ data }),
    }) as unknown as Response;

  function lastRequestBody(): { amount: number; currency?: string } {
    const call = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return JSON.parse(String(call[1].body)) as {
      amount: number;
      currency?: string;
    };
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv("ZARINPAL_MERCHANT_ID", "test-merchant-id");
    vi.stubEnv("ZARINPAL_MODE", "sandbox");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the charge as Toman x10 Rial in IRR", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ code: 100, authority: "A0000000000000000000000000000000", message: "ok" }),
    );

    await request({
      amountToman: 4_500_000,
      description: "Order test",
      callbackUrl: "https://example.com/checkout/callback",
    });

    const body = lastRequestBody();
    expect(body.amount).toBe(45_000_000);
    expect(body.currency).toBe("IRR");
  });

  it("never sends the EUR display price to the gateway", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ code: 100, authority: "A0000000000000000000000000000000", message: "ok" }),
    );

    // Same product, two independently admin-entered prices.
    const priceToman = 4_500_000;
    const priceEur = 2_500;

    await request({
      amountToman: priceToman,
      description: "Order test",
      callbackUrl: "https://example.com/checkout/callback",
    });

    const body = lastRequestBody();
    expect(body.amount).toBe(toRial(priceToman));
    expect(body.amount).not.toBe(toRial(priceEur));
    // A EUR-derived charge would land near 25,000 Rial, far below the minimum.
    expect(body.amount).toBeGreaterThan(25_000);
  });

  it("verifies using the same Toman x10 Rial amount as the request", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ code: 100, ref_id: "123456789", message: "ok" }),
    );

    await verify({
      authority: "A0000000000000000000000000000000",
      amountToman: 4_500_000,
    });

    expect(lastRequestBody().amount).toBe(45_000_000);
  });
});
