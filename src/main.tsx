import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import "./index.css";
import {
  CACHE_MAX_AGE,
  persister,
  queryClient,
  registerMutationDefaults,
} from "@/lib/query-client";
import { router } from "./router";

registerMutationDefaults(queryClient);

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
