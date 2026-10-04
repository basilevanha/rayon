import { dehydrate, QueryClient, type Mutation } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { z } from "zod";
import { isAuthError, shouldRetryMutation } from "@/lib/network";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const CACHE_MAX_AGE = WEEK_MS;

// Version du format du cache enregistré, à changer seulement si la forme des données en
// cache change. Pas la version de l'app : une mise à jour viderait la file (OFF-02).
export const CACHE_VERSION = "1";

const persistedClientSchema = z.object({
  timestamp: z.number(),
  buster: z.string(),
  clientState: z.object({
    queries: z.array(z.unknown()),
    mutations: z.array(z.unknown()),
  }),
});

// Un cache corrompu est ignoré : timestamp 0 le fait expirer à la restauration.
const EMPTY_CACHE: PersistedClient = {
  timestamp: 0,
  buster: "",
  clientState: { queries: [], mutations: [] },
};

export function deserializeCache(raw: string): PersistedClient {
  try {
    const parsed = persistedClientSchema.safeParse(JSON.parse(raw));
    // Seule l'enveloppe est validée : le contenu a été écrit par dehydrate().
    return parsed.success ? (parsed.data as PersistedClient) : EMPTY_CACHE;
  } catch {
    return EMPTY_CACHE;
  }
}

// OFF-08 : une session refusée est réessayée souvent, pour repartir dès la reconnexion.
// Sinon, délai exponentiel (celui de TanStack Query par défaut).
export function mutationRetryDelay(failureCount: number, error: unknown): number {
  return isAuthError(error) ? 2000 : Math.min(1000 * 2 ** failureCount, 30_000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "offlineFirst", gcTime: WEEK_MS, retry: 2 },
    mutations: {
      networkMode: "offlineFirst",
      gcTime: WEEK_MS,
      retry: shouldRetryMutation,
      retryDelay: mutationRetryDelay,
    },
  },
});

const CACHE_KEY = "rayon-query-cache";

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((value) => value ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: CACHE_KEY,
  // OFF-02 : une modification faite juste avant de fermer l'app doit être enregistrée.
  // Avec 1 s, tout ce qui précède la fermeture de moins d'une seconde était perdu.
  throttleTime: 100,
  deserialize: (raw) => deserializeCache(raw),
});

// OFF-02 : une modification en cours d'envoi est enregistrée comme une modification en
// pause. Par défaut, TanStack Query n'enregistre que les secondes : fermer l'app pendant
// un envoi (au retour du réseau, par exemple) perdrait la modification.
export function shouldDehydrateMutation(mutation: Mutation<unknown, Error, unknown, unknown>) {
  return mutation.state.status === "pending";
}

// OFF-02 : au redémarrage, toutes les modifications restaurées sont rejouées, dans
// l'ordre (scope), qu'elles aient été en pause ou en cours d'envoi. Le serveur les
// accepte deux fois sans effet (fonctions idempotentes, ids générés par l'appareil).
export function resumePendingMutations(client: QueryClient): Promise<unknown> {
  const pending = client
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.state.status === "pending");
  return Promise.all(pending.map((mutation) => mutation.continue().catch(() => undefined)));
}

// OFF-02 : quand l'app passe en arrière-plan ou se ferme, le cache est écrit tout de suite,
// sans attendre le délai du persister : une modification faite juste avant reste en file.
export function flushCache(client: QueryClient, buster: string): Promise<void> {
  const persisted: PersistedClient = {
    timestamp: Date.now(),
    buster,
    clientState: dehydrate(client, { shouldDehydrateMutation }),
  };
  return set(CACHE_KEY, JSON.stringify(persisted));
}
