import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/features/auth/errors";

describe("authErrorMessage", () => {
  it("points to the access request when signup is refused (ISC-02)", () => {
    expect(authErrorMessage({ message: "inscription_sur_invitation" })).toEqual({
      message: "L'inscription se fait sur invitation",
      requestAccess: true,
    });
    expect(authErrorMessage({ message: "code_invalide" })).toEqual({
      message: "Ce code d'invitation n'est pas valable. L'inscription se fait sur invitation",
      requestAccess: true,
    });
  });

  it("reports a full signup cap without access request (ISC-06)", () => {
    expect(authErrorMessage({ message: "inscriptions_completes" })).toEqual({
      message: "Les inscriptions sont momentanément complètes",
      requestAccess: false,
    });
  });

  it("maps an expired or wrong one-time code", () => {
    expect(
      authErrorMessage({ code: "otp_expired", message: "Token has expired or is invalid" }).message,
    ).toBe("Code invalide ou expiré");
  });

  it("maps a network failure", () => {
    expect(
      authErrorMessage({ name: "AuthRetryableFetchError", message: "Failed to fetch" }).message,
    ).toBe("Connexion impossible hors ligne");
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ message: "boom" }).message).toBe(
      "Une erreur est survenue, réessayez",
    );
  });
});
