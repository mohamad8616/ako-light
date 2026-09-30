/**
 * Order-receipt policy and formatting (lib/notifications/order-receipt-text.ts).
 *
 * These are the decisions that would silently send a receipt to nowhere — a
 * synthetic phone-account address, or the wrong channel — so they are pinned
 * here rather than only exercised through the payment callback.
 */
import { describe, expect, it } from "vitest";
import { formatToman } from "@/lib/i18n/price";
import {
  buildOrderReceiptText,
  buildOrderUrl,
  isDeliverableEmail,
  readItemName,
  resolveReceiptChannel,
} from "@/lib/notifications/order-receipt-text";

describe("isDeliverableEmail", () => {
  it("accepts a real address", () => {
    expect(isDeliverableEmail("customer@example.com")).toBe(true);
  });

  it("rejects the synthetic address phone-based sign-ups get", () => {
    // better-auth mints `<phone>@phone.ako-light.local` — mail sent here is lost.
    expect(isDeliverableEmail("09191234567@phone.ako-light.local")).toBe(false);
  });

  it("rejects the synthetic domain case-insensitively", () => {
    expect(isDeliverableEmail("x@PHONE.AKO-LIGHT.LOCAL")).toBe(false);
  });

  it("rejects empty, blank and missing values", () => {
    expect(isDeliverableEmail("")).toBe(false);
    expect(isDeliverableEmail("   ")).toBe(false);
    expect(isDeliverableEmail(null)).toBe(false);
    expect(isDeliverableEmail(undefined)).toBe(false);
  });
});

describe("resolveReceiptChannel", () => {
  it("prefers the account's verified number over the shipping contact", () => {
    expect(
      resolveReceiptChannel({
        accountPhone: "09191112222",
        orderPhone: "09193334444",
        email: "real@example.com",
      }),
    ).toEqual({ kind: "sms", mobile: "09191112222" });
  });

  it("falls back to the shipping phone when the account has none", () => {
    expect(
      resolveReceiptChannel({
        accountPhone: null,
        orderPhone: "09193334444",
        email: "real@example.com",
      }),
    ).toEqual({ kind: "sms", mobile: "09193334444" });
  });

  it("treats a blank account number as absent", () => {
    expect(
      resolveReceiptChannel({
        accountPhone: "   ",
        orderPhone: "09193334444",
      }),
    ).toEqual({ kind: "sms", mobile: "09193334444" });
  });

  it("uses email only when there is no phone at all", () => {
    expect(
      resolveReceiptChannel({
        accountPhone: null,
        orderPhone: null,
        email: "real@example.com",
      }),
    ).toEqual({ kind: "email", to: "real@example.com" });
  });

  it("refuses the synthetic address, reporting no channel", () => {
    const channel = resolveReceiptChannel({
      accountPhone: null,
      orderPhone: null,
      email: "09191234567@phone.ako-light.local",
    });
    expect(channel.kind).toBe("none");
  });

  it("reports no channel when every contact is missing", () => {
    expect(resolveReceiptChannel({}).kind).toBe("none");
  });
});

describe("readItemName", () => {
  it("prefers the Persian half of a Localized name", () => {
    expect(readItemName({ en: "Lamp", fa: "چراغ" })).toBe("چراغ");
  });

  it("falls back to English when Persian is empty", () => {
    expect(readItemName({ en: "Lamp", fa: "  " })).toBe("Lamp");
  });

  it("accepts a plain string", () => {
    expect(readItemName("Lamp")).toBe("Lamp");
  });

  it("degrades to a placeholder for junk", () => {
    expect(readItemName(null)).toBe("—");
    expect(readItemName({})).toBe("—");
    expect(readItemName(42)).toBe("—");
  });
});

describe("buildOrderUrl", () => {
  it("targets the checkout callback with the params it needs", () => {
    const url = new URL(
      buildOrderUrl({
        orderId: "order-1",
        authority: "AUTH123",
        baseUrl: "https://shop.example.com",
      }),
    );

    expect(url.origin).toBe("https://shop.example.com");
    expect(url.pathname).toBe("/checkout/callback");
    expect(url.searchParams.get("orderId")).toBe("order-1");
    expect(url.searchParams.get("Authority")).toBe("AUTH123");
    expect(url.searchParams.get("Status")).toBe("OK");
  });

  it("tolerates a base URL with a trailing slash", () => {
    expect(
      buildOrderUrl({ orderId: "o", baseUrl: "https://x.test///" }),
    ).toContain("https://x.test/checkout/callback");
  });

  it("omits the authority when there is none", () => {
    const url = new URL(buildOrderUrl({ orderId: "o", baseUrl: "https://x.test" }));
    expect(url.searchParams.has("Authority")).toBe(false);
  });

  it("carries the signed access token when one is supplied", () => {
    const url = new URL(
      buildOrderUrl({
        orderId: "order-1",
        authority: "AUTH123",
        baseUrl: "https://shop.example.com",
        token: "order-1.1790000000.signature",
      }),
    );

    expect(url.searchParams.get("token")).toBe("order-1.1790000000.signature");
  });

  it("omits the token entirely when there is none", () => {
    // The session-gated form that was sent before tokens existed. A `token=`
    // with an empty value would be worse than absent: the page would treat the
    // link as token-bearing and fail the signature check instead of falling
    // back cleanly to the session path.
    const withoutToken = new URL(
      buildOrderUrl({ orderId: "o", baseUrl: "https://x.test" }),
    );
    const withNull = new URL(
      buildOrderUrl({ orderId: "o", baseUrl: "https://x.test", token: null }),
    );

    expect(withoutToken.searchParams.has("token")).toBe(false);
    expect(withNull.searchParams.has("token")).toBe(false);
  });
});

describe("buildOrderReceiptText", () => {
  const url = "https://x.test/checkout/callback?orderId=o&Status=OK";

  it("carries the order id, the total in Toman and the link", () => {
    const text = buildOrderReceiptText({
      orderId: "order-1",
      refId: "REF-9",
      totalToman: 1_500_000,
      items: [{ name: { en: "Lamp", fa: "چراغ" }, quantity: 2, unitPriceAtPurchase: "750000" }],
      url,
    });

    expect(text).toContain("order-1");
    expect(text).toContain("REF-9");
    expect(text).toContain(formatToman(1_500_000));
    expect(text).toContain("چراغ");
    expect(text).toContain("× 2");
    expect(text).toContain(url);
  });

  it("never converts the stored Toman figure to Rial", () => {
    const text = buildOrderReceiptText({
      orderId: "order-1",
      totalToman: 1_500_000,
      items: [],
      url,
    });

    // 1,500,000 Toman is 15,000,000 Rial. The x10 conversion belongs to the
    // ZarinPal call boundary, never to a customer-facing amount.
    expect(text).toContain(formatToman(1_500_000));
    expect(text).not.toContain(formatToman(15_000_000));
  });

  it("omits the reference line when the payment has no ref id", () => {
    const text = buildOrderReceiptText({
      orderId: "order-1",
      refId: null,
      totalToman: 1000,
      items: [],
      url,
    });
    expect(text).not.toContain("کد پیگیری");
  });
});
