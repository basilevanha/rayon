import { createRouter } from "@tanstack/react-router";
import { pageTransition } from "@/lib/page-transition";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Animation push / pop entre « Mes listes » et une liste (styles dans index.css).
  // Sans prise en charge des types de transition, aucune animation.
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      const transition = pageTransition(fromLocation?.pathname, toLocation.pathname);
      return transition ? [transition] : false;
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
