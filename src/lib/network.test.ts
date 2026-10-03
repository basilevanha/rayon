import { describe, expect, it } from "vitest";
import { isNetworkError, shouldRetryMutation } from "@/lib/network";

describe("isNetworkError", () => {
  it.each([
    new TypeError("Failed to fetch"),
    { message: "TypeError: Failed to fetch", code: "" },
    { message: "NetworkError when attempting to fetch resource." },
    { message: "Load failed" },
  ])("detects a network failure: %o", (error) => {
    expect(isNetworkError(error)).toBe(true);
  });

  it.each([new Error("boom"), { message: "reserve_au_createur", code: "42501" }, null, "x"])(
    "ignores other errors: %o",
    (error) => {
      expect(isNetworkError(error)).toBe(false);
    },
  );
});

describe("shouldRetryMutation (OFF-02)", () => {
  it("keeps retrying a network failure, so the mutation pauses offline", () => {
    expect(shouldRetryMutation(100, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("never retries a server refusal", () => {
    expect(shouldRetryMutation(0, { message: "nom_incorrect", code: "22023" })).toBe(false);
  });
});
