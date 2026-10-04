import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCleanup = vi.fn();
vi.mock("@/lib/orders/stale-cleanup", () => ({
  cleanupStalePendingOrders: mockCleanup,
}));

const { GET } = await import("@/app/api/cron/stale-orders/route");
const SECRET = "a-long-random-cron-secret-12345";

function request(authorization?: string): Request {
  return new Request("https://example.test/api/cron/stale-orders", {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe("Vercel cron endpoint", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    mockCleanup.mockReset();
    mockCleanup.mockResolvedValue({
      scanned: 2,
      transitioned: 1,
      skipped: 1,
      errors: 0,
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "", "Bearer wrong", `Basic ${SECRET}`, `Bearer ${SECRET}x`])(
    "rejects missing/incorrect Authorization %j without touching the DB",
    async (header) => {
      const response = await GET(request(header));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
      expect(mockCleanup).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the secret is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(request("Bearer "));
    expect(response.status).toBe(401);
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it("fails closed for a short, guessable secret even if the caller knows it", async () => {
    vi.stubEnv("CRON_SECRET", "weak");
    const response = await GET(request("Bearer weak"));
    expect(response.status).toBe(401);
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it("runs exactly once and returns only operational counts for the matching secret", async () => {
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      scanned: 2,
      transitioned: 1,
      skipped: 1,
      errors: 0,
    });
  });

  it("reports partial failures with a non-2xx status but no order data", async () => {
    mockCleanup.mockResolvedValue({ scanned: 2, transitioned: 1, skipped: 0, errors: 1 });
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      scanned: 2,
      transitioned: 1,
      skipped: 0,
      errors: 1,
    });
  });

  it("hides unexpected driver failures and never echoes secrets", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCleanup.mockRejectedValue(new Error("SQL credentials and customer address"));
    try {
      const response = await GET(request(`Bearer ${SECRET}`));
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toContain("cleanup_failed");
      expect(body).not.toContain("SQL credentials");
      expect(body).not.toContain(SECRET);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
