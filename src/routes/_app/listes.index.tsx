import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AccountButton } from "@/features/auth/account";
import { listsQueryOptions } from "@/features/lists/queries";
import { useDrawerNavigation } from "@/hooks/use-drawer-navigation";

export const Route = createFileRoute("/_app/listes/")({
  component: MyListsPage,
});

// NAV-06 : toutes les listes du compte. Le nombre d'articles à acheter (LST-02)
// arrive avec les articles.
function MyListsPage() {
  const { auth } = Route.useRouteContext();
  const { t } = useTranslation("lists");
  const drawers = useDrawerNavigation();
  const { data: lists } = useQuery(listsQueryOptions(auth.userId));

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 pr-2">
        <h1 className="flex-1 truncate text-lg font-semibold">{t("myLists.title")}</h1>
        <AccountButton userId={auth.userId} />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-4">
        {lists?.length === 0 && <p className="text-muted-foreground">{t("myLists.empty")}</p>}
        {lists && lists.length > 0 && (
          <ul className="flex flex-col gap-1">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  to="/listes/$listId"
                  params={{ listId: list.id }}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span aria-hidden className="text-2xl">
                    {list.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{list.name}</span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      {/* NAV-06, UI-01 : action fixée en bas, au-dessus de la zone de sécurité. */}
      <div className="sticky bottom-0 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button className="h-11 w-full gap-2" onClick={() => drawers.open("ajouter")}>
          <Plus aria-hidden />
          {t("actions.add")}
        </Button>
      </div>
    </>
  );
}
