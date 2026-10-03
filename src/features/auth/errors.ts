export type AuthErrorLike = { message?: string; code?: string; name?: string };

export type AuthErrorKey =
  | "auth:errors.signupByInvitation"
  | "auth:errors.invalidInvitation"
  | "auth:errors.signupsFull"
  | "auth:errors.invalidOtp"
  | "common:errors.offline"
  | "common:errors.retry";

export type AuthErrorDisplay = { messageKey: AuthErrorKey; requestAccess: boolean };

// Clés renvoyées par le hook controle_inscription (ISC-02, ISC-06).
const hookErrors: Record<string, AuthErrorDisplay> = {
  inscription_sur_invitation: { messageKey: "auth:errors.signupByInvitation", requestAccess: true },
  code_invalide: { messageKey: "auth:errors.invalidInvitation", requestAccess: true },
  inscriptions_completes: { messageKey: "auth:errors.signupsFull", requestAccess: false },
};

export function authErrorMessage(error: AuthErrorLike): AuthErrorDisplay {
  if (error.message && error.message in hookErrors) return hookErrors[error.message];
  if (error.code === "otp_expired")
    return { messageKey: "auth:errors.invalidOtp", requestAccess: false };
  if (error.name === "AuthRetryableFetchError") {
    return { messageKey: "common:errors.offline", requestAccess: false };
  }
  return { messageKey: "common:errors.retry", requestAccess: false };
}
