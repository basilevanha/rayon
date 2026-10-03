import { createFileRoute } from "@tanstack/react-router";
import { settingsSearchSchema } from "@/features/lists/list-settings";

// LST-05 : le panneau des réglages est affiché par la page de la liste (route parente),
// pour s'animer à l'ouverture comme à la fermeture, retour arrière compris.
export const Route = createFileRoute("/_app/listes/$listId/reglages")({
  validateSearch: settingsSearchSchema,
  component: () => null,
});
