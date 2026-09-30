import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildZarinPalBaseUrl,
  isMerchantIdShaped,
  isPaymentRequestSuccess,
  isVerificationSuccess,
  request,
  toRial,
  verify,
  ZarinPalError,
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
    vi.stubEnv(
      "ZARINPAL_MERCHANT_ID",
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
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

/**
 * THE BUG THESE TESTS PIN: a misconfigured ZARINPAL_MERCHANT_ID made ZarinPal
 * reject every call with `code: 0`, and the checkout callback recorded the
 * result as `Order.status = "failed"` — silently marking genuinely PAID orders
 * as failed, for every customer, with the customer told to retry.
 *
 * The fix is the `gateway` vs `rejected` distinction: a failure that carries no
 * verdict about the payment must be classifiable as such, so the caller can
 * refuse to write a terminal `failed` status. These tests assert that the
 * classification is correct for every path that can produce it — and that it is
 * NOT over-applied, since misclassifying a real decline as a gateway fault would
 * leave a cancelled order stuck pending forever.
 */
describe("ZarinPal failure classification (gateway vs rejected)", () => {
  const MERCHANT_UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const fetchMock = vi.fn();

  const jsonResponse = (
    data: Record<string, unknown>,
    status = 200,
  ): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ data }),
    }) as unknown as Response;

  /** Captures the error thrown by `fn`, failing loudly if it throws nothing. */
  async function capture(fn: () => Promise<unknown>): Promise<ZarinPalError> {
    try {
      await fn();
    } catch (error) {
      expect(error).toBeInstanceOf(ZarinPalError);
      return error as ZarinPalError;
    }
    throw new Error("expected the call to throw a ZarinPalError");
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv("ZARINPAL_MERCHANT_ID", MERCHANT_UUID);
    vi.stubEnv("ZARINPAL_MODE", "sandbox");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const verifyCall = () =>
    verify({ authority: "A0000000000000000000000000000000", amountToman: 1_000_000 });

  describe("the misconfigured merchant id — the original bug", () => {
    it("classifies an ABSENT merchant id as a gateway fault, not a rejection", async () => {
      vi.stubEnv("ZARINPAL_MERCHANT_ID", "");

      const error = await capture(verifyCall);

      expect(error.kind).toBe("gateway");
      expect(error.isGatewayFault).toBe(true);
      // The call must not even be attempted with no id to send.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("classifies a MISSING merchant id as a gateway fault", async () => {
      vi.stubEnv("ZARINPAL_MERCHANT_ID", "   ");

      expect((await capture(verifyCall)).kind).toBe("gateway");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("classifies a MALFORMED merchant id as a gateway fault without calling ZarinPal", async () => {
      // The dangerous shape: non-empty, so a presence check passes, but not a
      // UUID. ZarinPal would reject every call with code 0.
      vi.stubEnv("ZARINPAL_MERCHANT_ID", "my-merchant-name");

      const error = await capture(verifyCall);

      expect(error.kind).toBe("gateway");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("never echoes the merchant id in the error message", async () => {
      const secret = "super-secret-merchant-name";
      vi.stubEnv("ZARINPAL_MERCHANT_ID", secret);

      const error = await capture(verifyCall);

      expect(error.message).not.toContain(secret);
      expect(error.message).toContain("ZARINPAL_MERCHANT_ID");
    });

    it("shapes a malformed id as a gateway fault on the REQUEST path too", async () => {
      vi.stubEnv("ZARINPAL_MERCHANT_ID", "not-a-uuid");

      const error = await capture(() =>
        request({
          amountToman: 1_000_000,
          description: "Order test",
          callbackUrl: "https://example.com/checkout/callback",
        }),
      );

      expect(error.kind).toBe("gateway");
    });
  });

  describe("ZarinPal's business codes", () => {
    it("classifies code 0 on verify as a gateway fault — 'rejected the CALL', not the payment", async () => {
      // ZarinPal's answer to an unrecognised merchant id: a code, no verdict.
      fetchMock.mockResolvedValue(
        jsonResponse({ code: 0, message: "Invalid merchant" }),
      );

      const error = await capture(verifyCall);

      expect(error.kind).toBe("gateway");
      expect(error.code).toBe(0);
      // The message ZarinPal supplied is preserved — it names the real problem.
      expect(error.message).toBe("Invalid merchant");
    });

    it("classifies code 0 on request as a gateway fault", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ code: 0, message: "Bad" }));

      const error = await capture(() =>
        request({
          amountToman: 1_000_000,
          description: "Order test",
          callbackUrl: "https://example.com/checkout/callback",
        }),
      );

      expect(error.kind).toBe("gateway");
    });

    it("classifies a real decline (non-zero, non-success code) as rejected", async () => {
      // -51 etc.: ZarinPal answered ABOUT THIS PAYMENT. Writing "failed" is
      // correct, and treating this as a gateway fault would strand the order.
      fetchMock.mockResolvedValue(
        jsonResponse({ code: -51, message: "Payment was not successful" }),
      );

      const error = await capture(verifyCall);

      expect(error.kind).toBe("rejected");
      expect(error.isGatewayFault).toBe(false);
      expect(error.code).toBe(-51);
    });

    it("treats a success code with no ref_id as a success, not a failure", async () => {
      // ZarinPal does not guarantee a reference id in every success envelope,
      // and code 100/101 is the verdict that matters. Returning success (with a
      // null refId) is important: the callback keys the paid transition on the
      // code, so a missing ref_id must not be mistaken for a gateway fault.
      fetchMock.mockResolvedValue(jsonResponse({ code: 100, message: "ok" }));

      const result = await verifyCall();

      expect(result.code).toBe(100);
      expect(result.refId).toBeUndefined();
    });
  });

  describe("transport and envelope faults", () => {
    it("classifies a network failure as a gateway fault", async () => {
      fetchMock.mockRejectedValue(new Error("ENOTFOUND"));

      const error = await capture(verifyCall);

      expect(error.kind).toBe("gateway");
      expect(error.message).toContain("Could not reach ZarinPal");
    });

    it("classifies a 500 as a gateway fault", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "oops" }, 500));

      expect((await capture(verifyCall)).kind).toBe("gateway");
    });

    it("classifies a 400 as a gateway fault — a malformed CALL is not a decline", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "bad request" }, 400));

      expect((await capture(verifyCall)).kind).toBe("gateway");
    });

    it("classifies an unparseable body as a gateway fault rather than crashing", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
      } as unknown as Response);

      const error = await capture(verifyCall);

      expect(error.kind).toBe("gateway");
      expect(error.message).toContain("non-JSON");
    });
  });

  describe("isMerchantIdShaped", () => {
    it("accepts a canonical ZarinPal UUID, in either case", () => {
      expect(isMerchantIdShaped(MERCHANT_UUID)).toBe(true);
      expect(isMerchantIdShaped(MERCHANT_UUID.toUpperCase())).toBe(true);
      expect(isMerchantIdShaped(`  ${MERCHANT_UUID}  `)).toBe(true);
    });

    it("rejects anything that could not be a merchant id", () => {
      expect(isMerchantIdShaped("")).toBe(false);
      expect(isMerchantIdShaped("   ")).toBe(false);
      expect(isMerchantIdShaped("my-merchant-name")).toBe(false);
      expect(isMerchantIdShaped("CHANGEME")).toBe(false);
      // Truncated paste — 35 chars, the classic real-world case.
      expect(isMerchantIdShaped(MERCHANT_UUID.slice(0, -1))).toBe(false);
      // Extra character appended.
      expect(isMerchantIdShaped(`${MERCHANT_UUID}0`)).toBe(false);
      // Dashes in the wrong places.
      expect(isMerchantIdShaped(MERCHANT_UUID.replace("-", "_"))).toBe(false);
    });
  });
});

