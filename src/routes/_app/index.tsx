import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLastListStore } from "@/features/lists/last-list-store";
import { listsQueryOptions } from "@/features/lists/queries";

export const Route = createFileRoute("/_app/")({
  component: LaunchPage,
});

// NAV-01, LST-03 : rouvre la dernière liste ouverte, sinon « Mes listes ».
function LaunchPage() {
  const { auth } = Route.useRouteContext();
  const lastListId = useLastListStore((state) => state.lastListId);
  const { data: lists } = useQuery(listsQueryOptions(auth.userId));

  // Avant la première réponse, la dernière liste s'ouvre sans attendre (OFF-01).
  const reopen = lastListId && (lists === undefined || lists.some((l) => l.id === lastListId));

  if (reopen) return <Navigate to="/listes/$listId" params={{ listId: lastListId }} replace />;
  return <Navigate to="/listes" replace />;
}
