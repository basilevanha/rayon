import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/features/auth/errors";

describe("authErrorMessage", () => {
  it("points to the access request when signup is refused (ISC-02)", () => {
    expect(authErrorMessage({ message: "inscription_sur_invitation" })).toEqual({
      messageKey: "auth:errors.signupByInvitation",
      requestAccess: true,
      askNewLink: false,
    });
    expect(authErrorMessage({ message: "code_invalide" })).toEqual({
      messageKey: "auth:errors.invalidInvitation",
      requestAccess: true,
      askNewLink: false,
    });
  });

  it("reports a full signup cap without access request (ISC-06)", () => {
    expect(authErrorMessage({ message: "inscriptions_completes" })).toEqual({
      messageKey: "auth:errors.signupsFull",
      requestAccess: false,
      askNewLink: false,
    });
  });

  it.each([
    ["invitation_expiree", "lists:errors.invitationExpired"],
    ["invitation_revoquee", "lists:errors.invitationRevoked"],
    ["invitation_utilisee", "lists:errors.invitationUsed"],
  ] as const)(
    "explains a refused list invitation and offers a new link (INV-03): %s",
    (message, messageKey) => {
      expect(authErrorMessage({ message })).toEqual({
        messageKey,
        requestAccess: false,
        askNewLink: true,
      });
    },
  );

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
