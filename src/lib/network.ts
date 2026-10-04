const NETWORK_FAILURE = /Failed to fetch|NetworkError|Load failed/i;

// Échec réseau, levé par fetch (TypeError) ou relayé par supabase-js dans le message.
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null || !("message" in error)) return false;
  return typeof error.message === "string" && NETWORK_FAILURE.test(error.message);
}

// Codes PostgREST d'une session refusée : clé invalide, authentification requise, jeton expiré.
const AUTH_CODES = new Set(["PGRST301", "PGRST302", "PGRST303"]);

// OFF-08 : session refusée par le serveur (jeton expiré ou révoqué).
export function isAuthError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && typeof error.code === "string" && AUTH_CODES.has(error.code)) return true;
  return "message" in error && typeof error.message === "string" && /\bJWT\b/.test(error.message);
}

// OFF-02 : une mutation qui échoue faute de réseau est réessayée. Hors ligne, TanStack
// Query met alors la mutation en pause jusqu'au retour du réseau, au lieu de l'annuler.
// OFF-08 : de même tant que la session est refusée, jusqu'à la reconnexion.
// Un refus du serveur n'est jamais réessayé.
export function shouldRetryMutation(_failureCount: number, error: unknown): boolean {
  return isNetworkError(error) || isAuthError(error);
}
