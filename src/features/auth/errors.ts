export type AuthErrorLike = { message?: string; code?: string; name?: string };

export type AuthErrorDisplay = { message: string; requestAccess: boolean };

const SIGNUP_BY_INVITATION = "L'inscription se fait sur invitation";

// Clés renvoyées par le hook controle_inscription (ISC-02, ISC-06).
const hookErrors: Record<string, AuthErrorDisplay> = {
  inscription_sur_invitation: { message: SIGNUP_BY_INVITATION, requestAccess: true },
  code_invalide: {
    message: `Ce code d'invitation n'est pas valable. ${SIGNUP_BY_INVITATION}`,
    requestAccess: true,
  },
  inscriptions_completes: {
    message: "Les inscriptions sont momentanément complètes",
    requestAccess: false,
  },
};

export function authErrorMessage(error: AuthErrorLike): AuthErrorDisplay {
  if (error.message && error.message in hookErrors) return hookErrors[error.message];
  if (error.code === "otp_expired")
    return { message: "Code invalide ou expiré", requestAccess: false };
  if (error.name === "AuthRetryableFetchError") {
    return { message: "Connexion impossible hors ligne", requestAccess: false };
  }
  return { message: "Une erreur est survenue, réessayez", requestAccess: false };
}
