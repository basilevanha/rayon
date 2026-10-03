export type AuthErrorLike = { message?: string; code?: string; name?: string };

export type AuthErrorKey =
  | "auth:errors.signupByInvitation"
  | "auth:errors.invalidInvitation"
  | "auth:errors.signupsFull"
  | "auth:errors.invalidOtp"
  | "lists:errors.invitationExpired"
  | "lists:errors.invitationRevoked"
  | "lists:errors.invitationUsed"
  | "common:errors.offline"
  | "common:errors.retry";

// askNewLink : INV-03 propose de demander un nouveau lien à un membre de la liste.
export type AuthErrorDisplay = {
  messageKey: AuthErrorKey;
  requestAccess: boolean;
  askNewLink: boolean;
};

const refused = (messageKey: AuthErrorKey, requestAccess: boolean, askNewLink = false) => ({
  messageKey,
  requestAccess,
  askNewLink,
});

// Clés renvoyées par le hook controle_inscription (ISC-02, ISC-06, INV-03).
const hookErrors: Record<string, AuthErrorDisplay> = {
  inscription_sur_invitation: refused("auth:errors.signupByInvitation", true),
  code_invalide: refused("auth:errors.invalidInvitation", true),
  inscriptions_completes: refused("auth:errors.signupsFull", false),
  invitation_expiree: refused("lists:errors.invitationExpired", false, true),
  invitation_revoquee: refused("lists:errors.invitationRevoked", false, true),
  invitation_utilisee: refused("lists:errors.invitationUsed", false, true),
};

export function authErrorMessage(error: AuthErrorLike): AuthErrorDisplay {
  if (error.message && error.message in hookErrors) return hookErrors[error.message];
  if (error.code === "otp_expired") return refused("auth:errors.invalidOtp", false);
  if (error.name === "AuthRetryableFetchError") {
    return refused("common:errors.offline", false);
  }
  return refused("common:errors.retry", false);
}
