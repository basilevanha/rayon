const NETWORK_FAILURE = /Failed to fetch|NetworkError|Load failed/i;

// Échec réseau, levé par fetch (TypeError) ou relayé par supabase-js dans le message.
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null || !("message" in error)) return false;
  return typeof error.message === "string" && NETWORK_FAILURE.test(error.message);
}

// OFF-02 : une mutation qui échoue faute de réseau est réessayée. Hors ligne, TanStack
// Query met alors la mutation en pause jusqu'au retour du réseau, au lieu de l'annuler.
// Un refus du serveur n'est jamais réessayé.
export function shouldRetryMutation(_failureCount: number, error: unknown): boolean {
  return isNetworkError(error);
}
