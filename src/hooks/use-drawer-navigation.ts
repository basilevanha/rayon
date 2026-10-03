import { useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { z } from "zod";

export const DRAWERS = [
  "listes",
  "ajouter",
  "nouvelle",
  "rejoindre",
  "compte",
  "deconnexion",
  // ART-06 : tiroir d'édition d'un article (son id dans « article »).
  "article",
  // ART-05 : tous les rayons, pour choisir celui d'un nouvel article.
  "rayons",
] as const;
export type DrawerName = (typeof DRAWERS)[number];

export const drawerSearchSchema = z.object({
  tiroir: z.enum(DRAWERS).optional().catch(undefined),
  article: z.uuid().optional().catch(undefined),
});

// NAV-05 : chaque tiroir ouvert est une entrée d'historique, le retour arrière le ferme.
export function useDrawerNavigation() {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { tiroir, article } = useSearch({ from: "/_app" });

  return {
    current: tiroir,
    articleId: article,
    // replace : passer d'un tiroir à l'autre ne laisse pas d'entrée intermédiaire.
    open: (name: DrawerName, options?: { replace?: boolean; articleId?: string }) =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, tiroir: name, article: options?.articleId }),
        replace: options?.replace,
      }),
    close: () => {
      if (canGoBack) router.history.back();
      else
        void navigate({
          to: ".",
          search: (prev) => ({ ...prev, tiroir: undefined, article: undefined }),
          replace: true,
        });
    },
  };
}
