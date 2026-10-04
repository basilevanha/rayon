import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useDisplayStore, type ArticleDisplay } from "@/features/articles/display-store";

const DISPLAYS: { value: ArticleDisplay; labelKey: "toolbar.byRayon" | "toolbar.alphabetical" }[] =
  [
    { value: "rayon", labelKey: "toolbar.byRayon" },
    { value: "alpha", labelKey: "toolbar.alphabetical" },
  ];

// PRE-10 : vue et affichage. Le sélecteur de magasin et « Organiser les rayons »
// arrivent avec les magasins (lot 7) : la vue est « Défaut ».
export function ListToolbar() {
  const { t } = useTranslation("articles");
  const display = useDisplayStore((state) => state.display);
  const setDisplay = useDisplayStore((state) => state.setDisplay);
  // UI-08 : sans glissement si le système demande moins d'animations.
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-2">
      <span className="text-sm text-muted-foreground">
        {t("toolbar.view", { name: t("toolbar.defaultView") })}
      </span>
      <fieldset className="flex rounded-lg border p-0.5">
        <legend className="sr-only">{t("toolbar.display")}</legend>
        {DISPLAYS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            aria-pressed={display === value}
            onClick={() => setDisplay(value)}
            className="relative min-h-11 rounded-md px-3 text-sm aria-pressed:font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {/* Le fond de l'option choisie glisse d'une option à l'autre. */}
            {display === value && (
              <motion.span
                aria-hidden
                layoutId="article-display-indicator"
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.3 }
                }
                className="absolute inset-0 rounded-md bg-secondary"
              />
            )}
            <span className="relative">{t(labelKey)}</span>
          </button>
        ))}
      </fieldset>
    </div>
  );
}
