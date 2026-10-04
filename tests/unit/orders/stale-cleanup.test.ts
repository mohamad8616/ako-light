import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const mockClaim = vi.fn();
vi.mock("@/lib/db/prisma", () => ({
  prisma: { order: { findMany: mockFindMany } },
}));
vi.mock("@/lib/repositories/orders", () => ({
  claimPendingOrder: mockClaim,
}));

const { cleanupStalePendingOrders } = await import("@/lib/orders/stale-cleanup");
const NOW = new Date("2026-10-03T12:00:00.000Z");
const CUTOFF = new Date("2026-10-02T12:00:00.000Z");

function run(batchSize = 3) {
  return cleanupStalePendingOrders({
    now: NOW,
    config: { expirationMinutes: 1_440, batchSize },
  });
}

describe("bounded stale pending cleanup orchestration", () => {
  beforeEach(() => {
    mockFindMany.mockReset().mockResolvedValue([]);
    mockClaim.mockReset().mockResolvedValue({ changed: true });
  });

  it("selects only old pending, unfulfilled orders and only IDs", async () => {
    await expect(run(2)).resolves.toEqual({
      scanned: 0,
      transitioned: 0,
      skipped: 0,
      errors: 0,
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "pending",
        fulfillmentStatus: "unfulfilled",
        createdAt: { lt: CUTOFF },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 2,
      select: { id: true },
    });
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it("sends the SAME cutoff to the final guarded transition", async () => {
    mockFindMany.mockResolvedValue([{ id: "a" }]);
    expect(await run()).toEqual({ scanned: 1, transitioned: 1, skipped: 0, errors: 0 });
    expect(mockClaim).toHaveBeenCalledWith({
      orderId: "a",
      status: "failed",
      staleBefore: CUTOFF,
      txOptions: { maxWait: 30_000, timeout: 30_000 },
    });
  });

  it("counts a callback/another worker winning the race as skipped", async () => {
    mockFindMany.mockResolvedValue([{ id: "a" }]);
    mockClaim.mockResolvedValue({ changed: false });
    expect(await run()).toEqual({ scanned: 1, transitioned: 0, skipped: 1, errors: 0 });
  });

  it("continues after a per-order error without leaking it in the summary", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindMany.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    mockClaim.mockResolvedValueOnce({ changed: true })
      .mockResolvedValueOnce({ changed: false })
      .mockRejectedValueOnce(new Error("sensitive DB connection details"))
      .mockResolvedValueOnce({ changed: true });
    try {
      expect(await run(4)).toEqual({ scanned: 4, transitioned: 2, skipped: 1, errors: 1 });
      expect(mockClaim).toHaveBeenCalledTimes(4);
      expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive DB connection details");
    } finally {
      log.mockRestore();
    }
  });

  it("propagates a selection failure rather than reporting a false empty success", async () => {
    mockFindMany.mockRejectedValue(new Error("database unavailable"));
    await expect(run()).rejects.toThrow("database unavailable");
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it("refuses an unbounded batch even if a caller bypasses env parsing", async () => {
    await expect(run(101)).rejects.toThrow("Invalid stale-order cleanup batch size");
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
