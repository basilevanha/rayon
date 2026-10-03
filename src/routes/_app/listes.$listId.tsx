import { useEffect } from "react";
import {
  createFileRoute,
  Navigate,
  Outlet,
  useCanGoBack,
  useMatchRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLastListStore } from "@/features/lists/last-list-store";
import { ListHeader } from "@/features/lists/list-header";
import { ListSettingsSheet } from "@/features/lists/list-settings";
import { useIsCreatingList } from "@/features/lists/mutations";
import { listQueryOptions } from "@/features/lists/queries";

export const Route = createFileRoute("/_app/listes/$listId")({
  component: ListPage,
});

function ListPage() {
  const { listId } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const { t } = useTranslation("lists");
  const { data: list } = useQuery(listQueryOptions(listId));
  const creating = useIsCreatingList(listId);
  const setLastListId = useLastListStore((state) => state.setLastListId);
  const forgetList = useLastListStore((state) => state.forgetList);
  const inaccessible = list === null && !creating;
  const settings = useSettingsSheet(listId);

  // LST-03 : mémorise la liste ouverte, oublie celle qui n'est plus accessible.
  useEffect(() => {
    if (inaccessible) forgetList(listId);
    else setLastListId(listId);
  }, [inaccessible, listId, forgetList, setLastListId]);

  if (inaccessible) return <Navigate to="/" replace />;
  if (!list) return null;

  return (
    <>
      <ListHeader list={list} userId={auth.userId} />
      <main className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
        <p>{t("list.empty")}</p>
      </main>
      <ListSettingsSheet
        list={list}
        userId={auth.userId}
        open={settings.open}
        onClose={settings.close}
      />
      <Outlet />
    </>
  );
}

// LST-05 : réglages ouverts tant que l'URL est /listes/<id>/reglages.
function useSettingsSheet(listId: string) {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return {
    open: Boolean(matchRoute({ to: "/listes/$listId/reglages", params: { listId }, fuzzy: true })),
    close: () => {
      if (canGoBack) router.history.back();
      else void navigate({ to: "/listes/$listId", params: { listId }, replace: true });
    },
  };
}
