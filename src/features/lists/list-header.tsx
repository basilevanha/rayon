import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MemberAvatars } from "@/features/lists/member-avatars";
import { listsQueryOptions } from "@/features/lists/queries";
import type { ListDetail } from "@/features/lists/schemas";
import { useDrawerNavigation } from "@/hooks/use-drawer-navigation";

const iconLink =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

// NAV-02 : retour vers l'accueil à gauche ; au centre, le nom qui ouvre le tiroir
// des listes (NAV-03) ; à droite, membres et réglages. Les deux côtés ont la même
// largeur pour que le titre soit centré sur l'écran.
export function ListHeader({ list, userId }: { list: ListDetail; userId: string }) {
  const { t } = useTranslation("lists");
  const drawers = useDrawerNavigation();
  const { data: lists } = useQuery(listsQueryOptions(userId));
  // NAV-03 : avec une seule liste, rien à changer : ni flèche ni tiroir.
  const canSwitch = (lists?.length ?? 0) > 1;
  const title = (
    <>
      <span aria-hidden className="shrink-0 text-xl">
        {list.emoji}
      </span>
      <span className="truncate text-lg font-semibold">{list.name}</span>
    </>
  );

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-2">
      <div className="flex w-28 shrink-0 items-center">
        <Link to="/listes" aria-label={t("header.back")} className={iconLink}>
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
      </div>
      {canSwitch ? (
        <button
          type="button"
          onClick={() => drawers.open("listes")}
          aria-label={t("header.switchList", { name: list.name })}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {title}
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <h1 className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
          {title}
        </h1>
      )}
      <div className="flex w-28 shrink-0 items-center justify-end gap-1">
        <MemberAvatars members={list.members} visible={2} />
        <Link
          to="/listes/$listId/reglages"
          params={{ listId: list.id }}
          aria-label={t("header.settings")}
          className={iconLink}
        >
          <Settings aria-hidden className="size-5" />
        </Link>
      </div>
    </header>
  );
}
