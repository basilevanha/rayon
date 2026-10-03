import { useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { z } from "zod";

export const DRAWERS = [
  "listes",
  "ajouter",
  "nouvelle",
  "rejoindre",
  "compte",
  "deconnexion",
] as const;
export type DrawerName = (typeof DRAWERS)[number];

export const drawerSearchSchema = z.object({
  tiroir: z.enum(DRAWERS).optional().catch(undefined),
});

// NAV-05 : chaque tiroir ouvert est une entrée d'historique, le retour arrière le ferme.
export function useDrawerNavigation() {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { tiroir } = useSearch({ from: "/_app" });

  return {
    current: tiroir,
    // replace : passer d'un tiroir à l'autre ne laisse pas d'entrée intermédiaire.
    open: (name: DrawerName, options?: { replace?: boolean }) =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, tiroir: name }),
        replace: options?.replace,
      }),
    close: () => {
      if (canGoBack) router.history.back();
      else
        void navigate({
          to: ".",
          search: (prev) => ({ ...prev, tiroir: undefined }),
          replace: true,
        });
    },
  };
}
