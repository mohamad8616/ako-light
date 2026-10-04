import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLEANUP_BATCH_SIZE,
  DEFAULT_PENDING_ORDER_EXPIRATION_MINUTES,
  readStaleOrderConfig,
  staleOrderCutoff,
} from "@/lib/orders/stale-config";

describe("stale order configuration", () => {
  it("defaults to a documented 24-hour grace period and a bounded batch", () => {
    expect(readStaleOrderConfig({})).toEqual({
      expirationMinutes: 1_440,
      batchSize: 25,
    });
    expect(DEFAULT_PENDING_ORDER_EXPIRATION_MINUTES).toBe(1_440);
    expect(DEFAULT_CLEANUP_BATCH_SIZE).toBe(25);
  });

  it("accepts explicit server-only overrides", () => {
    expect(readStaleOrderConfig({
      PENDING_ORDER_EXPIRATION_MINUTES: "2880",
      CLEANUP_BATCH_SIZE: "3",
    })).toEqual({ expirationMinutes: 2_880, batchSize: 3 });
  });

  it.each([
    [{ PENDING_ORDER_EXPIRATION_MINUTES: "0" }, "PENDING_ORDER_EXPIRATION_MINUTES"],
    [{ PENDING_ORDER_EXPIRATION_MINUTES: "-1" }, "PENDING_ORDER_EXPIRATION_MINUTES"],
    [{ PENDING_ORDER_EXPIRATION_MINUTES: "1.5" }, "PENDING_ORDER_EXPIRATION_MINUTES"],
    [{ PENDING_ORDER_EXPIRATION_MINUTES: "59" }, "PENDING_ORDER_EXPIRATION_MINUTES"],
    [{ PENDING_ORDER_EXPIRATION_MINUTES: "10081" }, "PENDING_ORDER_EXPIRATION_MINUTES"],
    [{ CLEANUP_BATCH_SIZE: "0" }, "CLEANUP_BATCH_SIZE"],
    [{ CLEANUP_BATCH_SIZE: "101" }, "CLEANUP_BATCH_SIZE"],
    [{ CLEANUP_BATCH_SIZE: "nope" }, "CLEANUP_BATCH_SIZE"],
  ])("rejects invalid setting %j", (env, name) => {
    expect(() => readStaleOrderConfig(env)).toThrow(name);
  });

  it("uses creation-time age with an exclusive cutoff", () => {
    const now = new Date("2026-10-03T12:00:00.000Z");
    expect(staleOrderCutoff(now, 60).toISOString()).toBe("2026-10-03T11:00:00.000Z");
    expect(staleOrderCutoff(now, 1_440).toISOString()).toBe("2026-10-02T12:00:00.000Z");
  });
});
