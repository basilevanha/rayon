import { QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { z } from "zod";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const CACHE_MAX_AGE = WEEK_MS;

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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "offlineFirst", gcTime: WEEK_MS, retry: 2 },
    mutations: { networkMode: "offlineFirst", gcTime: WEEK_MS },
  },
});

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((value) => value ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: "rayon-query-cache",
  throttleTime: 1000,
  deserialize: (raw) => deserializeCache(raw),
});
