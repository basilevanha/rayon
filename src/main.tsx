import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "./index.css";
import "@/lib/i18n";
import { CACHE_MAX_AGE, persister, queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { registerMutationDefaults } from "./mutation-defaults";
import { router } from "./router";

registerMutationDefaults(queryClient);

// Connexion par le lien de l'email, déconnexion : les gardes de route sont réévaluées.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT") void router.invalidate();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: __APP_VERSION__ }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
