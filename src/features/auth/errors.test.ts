import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/features/auth/errors";

describe("authErrorMessage", () => {
  it("points to the access request when signup is refused (ISC-02)", () => {
    expect(authErrorMessage({ message: "inscription_sur_invitation" })).toEqual({
      messageKey: "auth:errors.signupByInvitation",
      requestAccess: true,
    });
    expect(authErrorMessage({ message: "code_invalide" })).toEqual({
      messageKey: "auth:errors.invalidInvitation",
      requestAccess: true,
    });
  });

  it("reports a full signup cap without access request (ISC-06)", () => {
    expect(authErrorMessage({ message: "inscriptions_completes" })).toEqual({
      messageKey: "auth:errors.signupsFull",
      requestAccess: false,
    });
  });

  it("maps an expired or wrong one-time code", () => {
    expect(
      authErrorMessage({ code: "otp_expired", message: "Token has expired or is invalid" })
        .messageKey,
    ).toBe("auth:errors.invalidOtp");
  });

  it("maps a network failure", () => {
    expect(
      authErrorMessage({ name: "AuthRetryableFetchError", message: "Failed to fetch" }).messageKey,
    ).toBe("common:errors.offline");
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ message: "boom" }).messageKey).toBe("common:errors.retry");
  });
});
