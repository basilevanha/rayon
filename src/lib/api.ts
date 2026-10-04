import { ACCOUNT_CHANGED, SESSION_LOST } from "@/lib/network";
import { supabase } from "@/lib/supabase";

// Envoie une écriture et lève l'erreur Postgrest pour que TanStack Query la traite.
// OFF-08 : sans session (jeton révoqué), la requête partirait avec la clé anonyme et serait
// refusée pour de bon. Elle échoue plutôt comme une session refusée : la modification
// reste en file jusqu'à la reconnexion (shouldRetryMutation).
// CPT-07 : userId, le compte qui a fait l'action. Une écriture d'un autre compte (file
// restée sur l'appareil) n'est jamais envoyée sous la session du compte connecté.
export async function call<T>(
  request: PromiseLike<{ data: T; error: unknown }>,
  userId?: string,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw Object.assign(new Error("session_perdue"), { code: SESSION_LOST });
  if (userId !== undefined && session.user.id !== userId) {
    throw Object.assign(new Error("compte_change"), { code: ACCOUNT_CHANGED });
  }
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

// Écriture faite par userId (variables d'une mutation), abandonnée si un autre compte est connecté.
export function callAs<T>(
  userId: string,
  request: PromiseLike<{ data: T; error: unknown }>,
): Promise<T> {
  return call(request, userId);
}
