import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ArticleDisplay } from "@/features/articles/display-store";
import { useSetArticleStatus, useUpdateArticle } from "@/features/articles/mutations";
import type { Article, Rayon } from "@/features/articles/schemas";
import { sortAlphabetically, sortByRayon } from "@/lib/sort";

// UI-10 : durée de l'annulation sur place.
export const UNDO_MS = 6000;
// Distance de glissement vers la gauche qui déclenche « Plus besoin » (PRE-06).
const SWIPE_THRESHOLD = 80;

export type Removed = { article: Article; at: number };

// PRE-06, UI-10, UI-12 : « Plus besoin » (glissement ou tiroir) renvoie l'article au
// catalogue ; il garde sa place sous forme de bande, le temps de l'annulation.
export function useNotNeeded(userId: string, listId: string, articles: readonly Article[]) {
  const setStatus = useSetArticleStatus();
  const updateArticle = useUpdateArticle();
  const [removed, setRemoved] = useState<ReadonlyMap<string, Removed>>(new Map());

  function forget(articleId: string) {
    setRemoved((prev) => {
      const next = new Map(prev);
      next.delete(articleId);
      return next;
    });
  }

  return {
    removed,
    forget,
    notNeeded(article: Article) {
      setStatus.mutate({
        userId,
        listId,
        articleId: article.id,
        status: "catalogue",
        seenStatus: article.status,
      });
      setRemoved((prev) => new Map(prev).set(article.id, { article, at: Date.now() }));
    },
    // Le statut se fixe (COU-10) ; la quantité vidée au catalogue (ART-02) est rétablie,
    // sans écraser un nom ou un rayon modifiés entre-temps.
    undo({ article }: Removed) {
      setStatus.mutate({
        userId,
        listId,
        articleId: article.id,
        status: "a_acheter",
        seenStatus: "catalogue",
      });
      const current = articles.find((a) => a.id === article.id) ?? article;
      if (article.quantity !== null) {
        updateArticle.mutate({
          userId,
          listId,
          articleId: article.id,
          name: current.name,
          rayonId: current.rayonId,
          quantity: article.quantity,
        });
      }
      forget(article.id);
    },
  };
}

type ArticleListProps = {
  articles: readonly Article[];
  rayons: readonly Rayon[];
  display: ArticleDisplay;
  highlightedId: string | null;
  onEdit: (article: Article) => void;
  notNeeded: ReturnType<typeof useNotNeeded>;
  /** Recherche et barre d'affichage, en tête de la colonne de gauche (UI-04). */
  header: ReactNode;
  /** Une recherche est saisie : ses résultats remplacent la colonne de gauche. */
  searching: boolean;
};

// PRE-01 : caddie s'il n'est pas vide, articles à acheter, puis « Tous les articles ».
// UI-04 : au-delà de 768 px, à gauche la recherche et les articles à acheter, à droite
// tous les articles.
export function ArticleList(props: ArticleListProps) {
  const { articles, rayons, display, highlightedId, onEdit, notNeeded, header, searching } = props;
  const { t } = useTranslation("articles");
  const { removed, forget, undo } = notNeeded;
  const [catalogueOpen, setCatalogueOpen] = useState(false);

  const inCart = articles.filter((a) => a.status === "caddie");
  const toBuy = [
    ...articles.filter((a) => a.status === "a_acheter" && !removed.has(a.id)),
    ...[...removed.values()].map((r) => r.article),
  ];
  const catalogue = articles.filter((a) => a.status === "catalogue" && !removed.has(a.id));

  const renderRow = (article: Article, swipeable: boolean) => {
    const entry = removed.get(article.id);
    if (entry) {
      return (
        <RemovedStrip
          key={article.id}
          name={article.name}
          since={entry.at}
          onUndo={() => undo(entry)}
          onExpire={() => forget(article.id)}
        />
      );
    }
    return (
      <ArticleRow
        key={article.id}
        article={article}
        highlighted={article.id === highlightedId}
        onEdit={() => onEdit(article)}
        onSwipe={swipeable ? () => notNeeded.notNeeded(article) : undefined}
      />
    );
  };

  const empty = articles.length === 0 && removed.size === 0;
  const catalogueGroups = (
    <Grouped articles={catalogue} rayons={rayons} display={display} render={renderRow} />
  );

  return (
    <div className="grid gap-x-8 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4 pb-4">
        {header}
        {/* PRE-07 */}
        {!searching && empty && (
          <p className="px-4 py-8 text-center text-muted-foreground">{t("sections.empty")}</p>
        )}
        {!searching && !empty && (
          <>
            {inCart.length > 0 && (
              <Section title={t("sections.cart")}>
                <Grouped articles={inCart} rayons={rayons} display={display} render={renderRow} />
              </Section>
            )}
            <Section title={t("sections.toBuy")}>
              {toBuy.length === 0 ? (
                <p className="px-4 py-2 text-muted-foreground">{t("sections.nothingToBuy")}</p>
              ) : (
                <Grouped
                  articles={toBuy}
                  rayons={rayons}
                  display={display}
                  render={(article) => renderRow(article, true)}
                />
              )}
            </Section>
            {/* Mobile : section repliée. */}
            <section className="md:hidden">
              <button
                type="button"
                aria-expanded={catalogueOpen}
                onClick={() => setCatalogueOpen((open) => !open)}
                className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronRight
                  aria-hidden
                  className={`size-4 transition-transform motion-reduce:transition-none ${catalogueOpen ? "rotate-90" : ""}`}
                />
                {t("sections.all", { count: catalogue.length })}
              </button>
              {catalogueOpen && catalogueGroups}
            </section>
          </>
        )}
      </div>
      {/* UI-04 : colonne de droite, toujours dépliée, visible pendant une recherche. */}
      <div className="hidden min-w-0 pt-2 pb-4 md:block">
        {!empty && (
          <Section title={t("sections.all", { count: catalogue.length })}>
            {catalogueGroups}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-4 pb-1 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// PRE-02, PRE-03, PRE-10 : par rayon (titres discrets, collés en haut), ou A → Z.
function Grouped(props: {
  articles: readonly Article[];
  rayons: readonly Rayon[];
  display: ArticleDisplay;
  render: (article: Article, swipeable: boolean) => ReactNode;
}) {
  const { articles, rayons, display, render } = props;
  if (display === "alpha") {
    return <ul>{sortAlphabetically(articles).map((a) => render(a, false))}</ul>;
  }
  const names = new Map(rayons.map((r) => [r.id, r.name]));
  return (
    <div>
      {sortByRayon({ articles, rayons }).map((section) => (
        <div key={section.rayonId}>
          <h3 className="sticky top-[7.25rem] z-[5] bg-background px-4 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {names.get(section.rayonId) ?? ""}
          </h3>
          <ul>{section.articles.map((a) => render(a, false))}</ul>
        </div>
      ))}
    </div>
  );
}

// ART-06 : un tap ouvre le tiroir d'édition. PRE-05 : aucune case à cocher.
function ArticleRow(props: {
  article: Article;
  highlighted: boolean;
  onEdit: () => void;
  onSwipe?: () => void;
}) {
  const { article, highlighted, onEdit, onSwipe } = props;
  const { t } = useTranslation("articles");
  const ref = useRef<HTMLLIElement>(null);
  const dragged = useRef(false);
  const reduceMotion = useReducedMotion();

  // REC-06 : l'article cherché est amené à l'écran (UI-08 : sans animation si demandé).
  useEffect(() => {
    if (highlighted)
      ref.current?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }, [highlighted, reduceMotion]);

  const content = (
    <button
      type="button"
      onClick={() => {
        // Un glissement ne vaut pas un tap.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onEdit();
      }}
      aria-label={t("row.edit", { name: article.name })}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset ${
        highlighted ? "bg-accent ring-2 ring-primary ring-inset" : "bg-background hover:bg-accent"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{article.name}</span>
      {article.quantity !== null && (
        <span className="shrink-0 text-sm text-muted-foreground">
          {t("row.quantity", { count: article.quantity })}
        </span>
      )}
    </button>
  );

  return (
    <li ref={ref} id={`article-${article.id}`} className="relative overflow-hidden">
      {onSwipe ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-end bg-destructive/15 px-4 text-sm font-medium text-destructive"
          >
            {t("drawer.notNeeded")}
          </div>
          <motion.div
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.6, right: 0 }}
            dragSnapToOrigin
            style={{ touchAction: "pan-y" }}
            onDragStart={() => (dragged.current = true)}
            onDragEnd={(_event: PointerEvent, info: PanInfo) => {
              if (info.offset.x < -SWIPE_THRESHOLD) onSwipe();
              // Le clic qui suit éventuellement le relâchement est ignoré une seule fois.
              setTimeout(() => (dragged.current = false), 0);
            }}
            className="relative"
          >
            {content}
          </motion.div>
        </>
      ) : (
        content
      )}
    </li>
  );
}

// UI-10 : « [article] retiré · Annuler », avec une barre de progression de 6 secondes.
function RemovedStrip(props: {
  name: string;
  since: number;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const { name, since, onUndo, onExpire } = props;
  const { t } = useTranslation("articles");
  const reduceMotion = useReducedMotion();
  // Temps restant à l'affichage : la bande peut être remontée (changement d'affichage).
  const [remaining] = useState(() => Math.max(0, UNDO_MS - (Date.now() - since)));
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const timer = setTimeout(() => expire(), remaining);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <li className="relative flex min-h-11 items-center gap-3 overflow-hidden bg-muted px-4 text-sm">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {t("removed.label", { name })}
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-11 items-center px-2 font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("removed.undo")}
      </button>
      <motion.span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 bg-primary"
        initial={{ width: `${(remaining / UNDO_MS) * 100}%`, opacity: 1 }}
        animate={reduceMotion ? { opacity: 0.4 } : { width: "0%" }}
        transition={{ duration: remaining / 1000, ease: "linear" }}
      />
    </li>
  );
}
