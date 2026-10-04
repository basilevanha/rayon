import { describe, expect, it } from "vitest";
import { listErrorMessage } from "@/features/lists/errors";

describe("listErrorMessage (INV-03)", () => {
  it.each([
    ["invitation_inconnue", "lists:errors.invitationUnknown", false],
    ["invitation_expiree", "lists:errors.invitationExpired", true],
    ["invitation_revoquee", "lists:errors.invitationRevoked", true],
    ["invitation_utilisee", "lists:errors.invitationUsed", true],
    ["invitation_anterieure_au_retrait", "lists:errors.invitationBeforeRemoval", true],
    ["limite_invitations", "lists:errors.invitationLimit", false],
    ["reserve_au_createur", "lists:errors.creatorOnly", false],
    ["nom_incorrect", "lists:errors.nameMismatch", false],
  ] as const)("maps %s", (message, messageKey, askNewLink) => {
    expect(listErrorMessage({ message, code: "22023" })).toEqual({ messageKey, askNewLink });
  });

  it("reports a network failure as offline", () => {
    expect(listErrorMessage(new TypeError("Failed to fetch"))).toEqual({
      messageKey: "common:errors.offline",
      askNewLink: false,
    });
  });

  it("falls back to a generic message", () => {
    expect(listErrorMessage(new Error("boom"))).toEqual({
      messageKey: "common:errors.retry",
      askNewLink: false,
    });
  });
});
