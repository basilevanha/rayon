import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "./index.css";
import "@/lib/i18n";
import {
  CACHE_MAX_AGE,
  CACHE_VERSION,
  flushCache,
  persister,
  queryClient,
  resumePendingMutations,
  shouldDehydrateMutation,
} from "@/lib/query-client";
import { claimDevice } from "@/features/auth/session";
import { clearDeviceData } from "@/features/auth/sign-out";
import { supabase } from "@/lib/supabase";
import { registerMutationDefaults } from "./mutation-defaults";
import { router } from "./router";

registerMutationDefaults(queryClient);

// Connexion par le lien de l'email, déconnexion : les gardes de route sont réévaluées.
// CPT-07 : si un autre compte se connecte (après une session perdue, par exemple), les
// données et la file de l'ancien compte sont effacées avant toute navigation.
supabase.auth.onAuthStateChange((event, session) => {
  void (async () => {
    if (session) {
      const user = { userId: session.user.id, email: session.user.email ?? null };
      if (claimDevice(user)) await clearDeviceData(queryClient);
    }
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") await router.invalidate();
  })();
});

// OFF-02 : rien ne se perd si l'app est fermée juste après une modification.
const flush = () => void flushCache(queryClient, CACHE_VERSION);
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_VERSION,
        dehydrateOptions: { shouldDehydrateMutation },
      }}
      onSuccess={() => void resumePendingMutations(queryClient)}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
