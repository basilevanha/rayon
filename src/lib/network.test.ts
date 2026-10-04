import { describe, expect, it } from "vitest";
import { isAuthError, isNetworkError, shouldRetryMutation } from "@/lib/network";

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

describe("isAuthError (OFF-08)", () => {
  it.each([
    { message: "JWT expired", code: "PGRST303" },
    { message: "No suitable key or wrong key type", code: "PGRST301" },
    { message: "Authentication required", code: "PGRST302" },
    { message: "invalid JWT: unable to parse or verify signature", code: "" },
  ])("detects a refused session: %o", (error) => {
    expect(isAuthError(error)).toBe(true);
  });

  it.each([{ message: "non_membre", code: "42501" }, new TypeError("Failed to fetch"), null])(
    "ignores other errors: %o",
    (error) => {
      expect(isAuthError(error)).toBe(false);
    },
  );
});

describe("shouldRetryMutation (OFF-08)", () => {
  it("keeps a change waiting while the session is refused, instead of dropping it", () => {
    expect(shouldRetryMutation(50, { message: "JWT expired", code: "PGRST303" })).toBe(true);
  });
});
