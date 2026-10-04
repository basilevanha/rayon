import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useCreateArticle, useSetArticleStatus } from "@/features/articles/mutations";
import { articleNameSchema, type Article, type Rayon } from "@/features/articles/schemas";
import { useDrawerNavigation } from "@/hooks/use-drawer-navigation";
import { foldName, normalizeName } from "@/lib/normalize";
import { createSearchIndex, searchArticles } from "@/lib/search";
import { suggestRayon, topRayons } from "@/lib/suggest-rayon";

type SearchBarProps = {
  userId: string;
  listId: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Non-deleted articles of this list (REC-01). */
  articles: readonly Article[];
  /** Articles of every list of the account, for the rayon suggestion (ART-05). */
  allArticles: readonly Article[];
  rayons: readonly Rayon[];
  /** REC-06 : an article already wanted is shown in the list. */
  onHighlight: (articleId: string) => void;
};

// Durée de l'animation de fermeture des tiroirs (components/ui/drawer.tsx).
const DRAWER_EXIT_MS = 500;

const row =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const chip =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

// REC-01 : barre fixée en haut de l'écran d'une liste. Ses résultats remplacent la liste
// tant qu'une recherche est saisie.
export function SearchBar(props: SearchBarProps) {
  const { userId, listId, query, onQueryChange, articles, allArticles, rayons, onHighlight } =
    props;
  const { t } = useTranslation(["search", "articles"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const drawers = useDrawerNavigation();
  const createArticle = useCreateArticle();
  const setStatus = useSetArticleStatus();
  // Nom à créer quand le tiroir des rayons est ouvert : la saisie peut avoir changé.
  const [pendingName, setPendingName] = useState("");

  const index = useMemo(() => createSearchIndex(articles), [articles]);
  const { results, canCreate } = useMemo(() => searchArticles(index, query), [index, query]);
  const name = query.trim();
  const otherRayon = rayons.find((r) => r.isOther);
  const rayonName = (id: string) => rayons.find((r) => r.id === id)?.name ?? "";

  // ART-05 : rayon du même article dans les autres listes, sinon les plus utilisés ici.
  const suggested = useMemo(
    () =>
      suggestRayon(
        normalizeName(query),
        allArticles.filter((a) => a.listId !== listId),
      ),
    [allArticles, listId, query],
  );
  const chips = useMemo(
    () => topRayons(articles, rayons, { exclude: otherRayon ? [otherRayon.id] : [] }),
    [articles, rayons, otherRayon],
  );

  // « Autre » toujours en dernier ; le rayon déjà proposé n'est pas répété.
  const chipIds = [...chips, otherRayon?.id].filter(
    (id): id is string => id !== undefined && id !== suggested,
  );

  // UI-05 : « / » place le focus dans la recherche.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // REC-09 : après un ajout, la barre se vide et garde le focus.
  function done() {
    onQueryChange("");
    inputRef.current?.focus();
  }

  function create(articleName: string, rayonId: string) {
    const parsed = articleNameSchema.safeParse(articleName);
    if (!parsed.success) return;
    createArticle.mutate({
      userId,
      listId,
      articleId: crypto.randomUUID(),
      name: parsed.data,
      rayonId,
      quantity: null,
    });
  }

  // REC-06 : un article du catalogue passe à acheter ; un article déjà voulu est montré.
  function select(article: Article) {
    if (article.status === "catalogue") {
      setStatus.mutate({ userId, listId, articleId: article.id, status: "a_acheter" });
      done();
    } else {
      onQueryChange("");
      inputRef.current?.blur();
      onHighlight(article.id);
    }
  }

  // REC-08 : Entrée sélectionne le premier résultat, sinon crée l'article.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      onQueryChange("");
      return;
    }
    if (event.key !== "Enter" || !name) return;
    event.preventDefault();
    const first = results[0];
    if (first) select(first.article);
    else if (canCreate && suggested) {
      create(name, suggested);
      done();
    } else if (canCreate) chipsRef.current?.querySelector("button")?.focus();
  }

  function openAllRayons() {
    setPendingName(name);
    drawers.open("rayons");
  }

  // REC-09 : après un choix dans « Tous les rayons… », le focus revient à la barre. Le
  // bouton qui a ouvert le tiroir a disparu avec la recherche : il est rendu à la main,
  // une fois l'animation de fermeture finie (le tiroir rend le focus à ce moment-là).
  const pickerOpen = drawers.current === "rayons" && pendingName !== "";
  const wasPickerOpen = useRef(false);
  useEffect(() => {
    const closed = wasPickerOpen.current && !pickerOpen;
    wasPickerOpen.current = pickerOpen;
    if (!closed) return;
    const timer = setTimeout(() => inputRef.current?.focus(), DRAWER_EXIT_MS);
    return () => clearTimeout(timer);
  }, [pickerOpen]);

  // NAV-05 : le tiroir rouvert par l'historique, sans nom à créer, se referme.
  const pickerOrphan = drawers.current === "rayons" && pendingName === "";
  useEffect(() => {
    if (pickerOrphan) drawers.close();
  }, [pickerOrphan, drawers]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-14 z-10 bg-background px-4 py-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label={t("label")}
            placeholder={t("placeholder")}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={80}
            className="h-11 pr-11 pl-9 text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={done}
              aria-label={t("clear")}
              className="absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </div>

      {name && (
        <section aria-label={t("results")} className="flex flex-col gap-1 px-4 pb-4">
          <ul className="flex flex-col gap-1">
            {results.map(({ article }) => (
              <li key={article.id}>
                <button type="button" className={row} onClick={() => select(article)}>
                  <span className="min-w-0 flex-1 truncate">{article.name}</span>
                  {article.quantity !== null && (
                    <span className="text-sm text-muted-foreground">
                      {t("articles:row.quantity", { count: article.quantity })}
                    </span>
                  )}
                  <StatusBadge status={article.status} />
                </button>
              </li>
            ))}
          </ul>

          {/* REC-07 : « Créer » en dernière position, sans nom identique dans la liste. */}
          {canCreate && (
            <div className="mt-1 flex flex-col gap-2 border-t pt-2">
              {suggested ? (
                // ART-05 : rayon présélectionné, création en un geste.
                <button
                  type="button"
                  className={row}
                  onClick={() => {
                    create(name, suggested);
                    done();
                  }}
                >
                  <Plus aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t("create", { name })}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {rayonName(suggested)}
                  </span>
                </button>
              ) : (
                // ART-05 : sinon, les pastilles sous « Créer [texte] » choisissent le rayon.
                <fieldset className="flex flex-col gap-2">
                  <legend className="flex w-full items-center gap-3 px-3 pt-1 text-base">
                    <Plus aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t("create", { name })}</span>
                    <span className="sr-only">{t("chooseRayon", { name })}</span>
                  </legend>
                  <div ref={chipsRef} className="flex flex-wrap gap-2 px-3 pb-1">
                    {chipIds.map((rayonId) => (
                      <button
                        key={rayonId}
                        type="button"
                        className={chip}
                        onClick={() => {
                          create(name, rayonId);
                          done();
                        }}
                      >
                        {rayonName(rayonId)}
                      </button>
                    ))}
                    <button type="button" className={chip} onClick={openAllRayons}>
                      {t("allRayons")}
                    </button>
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </section>
      )}

      <RayonPickerDrawer
        open={pickerOpen}
        onClose={drawers.close}
        name={pendingName}
        rayons={rayons}
        onPick={(rayonId) => {
          // pendingName est gardé : le vider avant le changement d'URL ferait croire
          // à un tiroir orphelin, et l'historique reculerait deux fois.
          create(pendingName, rayonId);
          onQueryChange("");
          drawers.close();
        }}
      />
    </div>
  );
}

// REC-05 : statut de chaque résultat.
function StatusBadge({ status }: { status: Article["status"] }) {
  const { t } = useTranslation("search");
  if (status === "catalogue") return null;
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
      {status === "a_acheter" ? t("badges.toBuy") : t("badges.inCart")}
    </span>
  );
}

// ART-05 : « Tous les rayons… », avec un champ de filtre.
function RayonPickerDrawer(props: {
  open: boolean;
  onClose: () => void;
  name: string;
  rayons: readonly Rayon[];
  onPick: (rayonId: string) => void;
}) {
  const { open, onClose, name, rayons, onPick } = props;
  const { t } = useTranslation("search");
  const [filter, setFilter] = useState("");
  const folded = foldName(filter);
  const visible = rayons.filter((r) => foldName(r.name).includes(folded));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
        else setFilter("");
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("rayonsTitle", { name })}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-2 p-4">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label={t("rayonsFilter")}
            placeholder={t("rayonsFilter")}
            autoComplete="off"
            className="h-11 text-base"
          />
          <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
            {visible.length === 0 && <li className="py-2 text-muted-foreground">{t("noRayon")}</li>}
            {visible.map((rayon) => (
              <li key={rayon.id}>
                <button type="button" className={row} onClick={() => onPick(rayon.id)}>
                  {rayon.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
