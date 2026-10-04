import type { QueryClient } from "@tanstack/react-query";
import { useLastListStore } from "@/features/lists/last-list-store";
import { persister } from "@/lib/query-client";
import { forgetOwner } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

// CPT-07 : modifications qui attendent encore d'être envoyées au serveur.
export function countPendingChanges(client: QueryClient): number {
  return client
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.state.status === "pending").length;
}

// CPT-07 : données de l'appareil : cache, file d'attente et dernière liste ouverte.
export async function clearDeviceData(client: QueryClient): Promise<void> {
  client.getMutationCache().clear();
  client.clear();
  await persister.removeClient();
  useLastListStore.setState({ lastListId: null });
  useLastListStore.persist.clearStorage();
}

// CPT-07 : la déconnexion efface les données de l'appareil. Locale : elle fonctionne
// hors ligne et ne ferme pas les sessions des autres appareils.
export async function signOutAndClear(client: QueryClient): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
  forgetOwner();
  await clearDeviceData(client);
}
