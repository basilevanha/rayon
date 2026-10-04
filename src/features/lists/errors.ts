import { isNetworkError } from "@/lib/network";

export type ListErrorKey =
  | "lists:errors.invitationUnknown"
  | "lists:errors.invitationExpired"
  | "lists:errors.invitationRevoked"
  | "lists:errors.invitationUsed"
  | "lists:errors.invitationBeforeRemoval"
  | "lists:errors.invitationLimit"
  | "lists:errors.creatorOnly"
  | "lists:errors.nameMismatch"
  | "common:errors.offline"
  | "common:errors.retry";

// askNewLink : INV-03 propose de demander un nouveau lien.
export type ListErrorDisplay = { messageKey: ListErrorKey; askNewLink: boolean };

// Messages levés par les fonctions SQL de la migration « listes ».
const sqlErrors: Record<string, ListErrorDisplay> = {
  invitation_inconnue: { messageKey: "lists:errors.invitationUnknown", askNewLink: false },
  invitation_expiree: { messageKey: "lists:errors.invitationExpired", askNewLink: true },
  invitation_revoquee: { messageKey: "lists:errors.invitationRevoked", askNewLink: true },
  invitation_utilisee: { messageKey: "lists:errors.invitationUsed", askNewLink: true },
  invitation_anterieure_au_retrait: {
    messageKey: "lists:errors.invitationBeforeRemoval",
    askNewLink: true,
  },
  limite_invitations: { messageKey: "lists:errors.invitationLimit", askNewLink: false },
  reserve_au_createur: { messageKey: "lists:errors.creatorOnly", askNewLink: false },
  nom_incorrect: { messageKey: "lists:errors.nameMismatch", askNewLink: false },
};

export function listErrorMessage(error: { message?: string; code?: string }): ListErrorDisplay {
  const message = error.message ?? "";
  if (message in sqlErrors) return sqlErrors[message];
  if (isNetworkError(error)) {
    return { messageKey: "common:errors.offline", askNewLink: false };
  }
  return { messageKey: "common:errors.retry", askNewLink: false };
}
