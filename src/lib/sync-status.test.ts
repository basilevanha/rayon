import { describe, expect, it } from "vitest";
import { PENDING_DELAY_MS, syncStatus } from "@/lib/sync-status";

const now = 100_000;

describe("syncStatus (OFF-03)", () => {
  it("says offline, with the number of waiting changes", () => {
    expect(syncStatus({ online: false, pendingSince: [now - 10], now })).toEqual({
      kind: "offline",
      pending: 1,
    });
    expect(syncStatus({ online: false, pendingSince: [], now })).toEqual({
      kind: "offline",
      pending: 0,
    });
  });

  it("shows nothing online while changes are being sent", () => {
    expect(syncStatus({ online: true, pendingSince: [now - 500], now })).toBeNull();
  });

  it("shows the waiting changes online once the oldest waits for more than 3 seconds", () => {
    expect(PENDING_DELAY_MS).toBe(3000);
    expect(
      syncStatus({ online: true, pendingSince: [now - 200, now - PENDING_DELAY_MS - 1], now }),
    ).toEqual({ kind: "pending", pending: 2 });
  });

  it("shows nothing online without waiting changes", () => {
    expect(syncStatus({ online: true, pendingSince: [], now })).toBeNull();
  });
});
