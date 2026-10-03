import { useEffect, useMemo, useState } from "react";
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
import { ArticleDrawer } from "@/features/articles/article-drawer";
import { ArticleList, useNotNeeded } from "@/features/articles/article-list";
import { useDisplayStore } from "@/features/articles/display-store";
import { ListToolbar } from "@/features/articles/list-toolbar";
import { articlesQueryOptions, rayonsQueryOptions } from "@/features/articles/queries";
import { useLastListStore } from "@/features/lists/last-list-store";
import { SearchBar } from "@/features/search/search-bar";
import { useDrawerNavigation } from "@/hooks/use-drawer-navigation";
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
      <ListContent listId={listId} userId={auth.userId} />
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

// REC-01, PRE-01 : recherche, barre d'affichage, puis les articles de la liste.
function ListContent({ listId, userId }: { listId: string; userId: string }) {
  const { data: allArticles = [] } = useQuery(articlesQueryOptions(userId));
  const { data: rayons = [] } = useQuery(rayonsQueryOptions());
  const display = useDisplayStore((state) => state.display);
  const drawers = useDrawerNavigation();
  const [query, setQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const articles = useMemo(
    () => allArticles.filter((a) => a.listId === listId),
    [allArticles, listId],
  );
  const notNeeded = useNotNeeded(userId, listId, articles);
  const searching = query.trim() !== "";

  // REC-06 : la mise en évidence s'efface d'elle-même.
  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const editing =
    drawers.current === "article"
      ? (articles.find((a) => a.id === drawers.articleId) ?? null)
      : null;

  return (
    <main className="flex flex-1 flex-col">
      <ArticleList
        articles={articles}
        rayons={rayons}
        display={display}
        highlightedId={highlightedId}
        onEdit={(article) => drawers.open("article", { articleId: article.id })}
        notNeeded={notNeeded}
        searching={searching}
        header={
          <>
            <SearchBar
              userId={userId}
              listId={listId}
              query={query}
              onQueryChange={setQuery}
              articles={articles}
              allArticles={allArticles}
              rayons={rayons}
              onHighlight={setHighlightedId}
            />
            {!searching && <ListToolbar />}
          </>
        }
      />
      <ArticleDrawer
        userId={userId}
        listId={listId}
        article={editing}
        articles={articles}
        rayons={rayons}
        onClose={drawers.close}
        onNotNeeded={notNeeded.notNeeded}
      />
    </main>
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
